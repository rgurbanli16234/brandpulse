"""Default analyzer: multilingual keyword/lexicon rules (English, Azerbaijani, Russian).

Zero downloads, fully explainable. It produces:
  - sentiment_label + sentiment_score (-1..1)
  - is_complaint (negative sentiment AND an actionable signal)
  - topic (rule-based tagging)
  - language (script/keyword heuristic)
"""

from __future__ import annotations

import re
import difflib
from functools import lru_cache

from .base import AnalysisResult, Analyzer

# --------------------------------------------------------------------------- lexicons
NEGATIVE: tuple[str, ...] = (
    # English
    "bad", "terrible", "awful", "horrible", "worst", "worse", "poor", "broken", "damaged",
    "defective", "faulty", "defect", "scam", "fraud", "fraudulent", "refused", "refuse",
    "overcharged", "overpriced", "rude", "unhelpful", "slow", "delayed", "late", "missing",
    "canceled", "cancelled", "disappointed", "disappointing", "useless", "garbage", "crap",
    "cheat", "cheated", "lied", "unacceptable", "disgusting", "misleading", "dirty", "moldy",
    "expired", "spoiled", "crashed", "outage", "ignored", "ignores", "unresponsive", "stolen",
    "incompetent", "unprofessional", "never received", "didn't receive", "did not receive",
    "double charged", "charged twice", "hidden fee", "hidden fees", "no response",
    "waste of money", "rip off", "ripoff", "not working", "doesn't work", "wrong order",
    "never again", "avoid this", "useless support", "bad service", "worst service",
    "crashing",
    # Azerbaijani
    "pis", "pisdir", "rezil", "rəzil", "bərbad", "dəhşət", "dəhşətli", "aldatdılar", "aldadılar",
    "aldatma", "aldadıcı", "yalan", "yalançı", "dələduz", "oğru", "oğurluq", "keyfiyyətsiz",
    "xarab", "sınıq", "qırıq", "pozulub", "işləmir", "nasaz", "cavab vermirlər", "cavab yoxdur",
    "qaytarmırlar", "qaytarılmadı", "geri qaytarmır", "pulu qaytarmadı", "gecikmə", "gecikdi",
    "gecikir", "gəlmədi", "itdi", "itirdilər", "yoxa çıxdı", "baha", "narazı", "narazıyam",
    "şikayət", "şikayətçiyəm", "dəstək yoxdur", "kobud", "kobudluq", "hörmətsiz", "iyrənc",
    "murdar", "zəif", "məyus", "məyus oldum", "pis iş", "rəzil xidmət", "sifariş gəlmədi",
    "pulumu tutdular", "iki dəfə siyahıya salındı", "tutdular", "xəta", "donur",
    "açılmır", "pulum çıxdı", "pul çıxdı", "xarab mal", "pis mal",
    # Russian
    "ужасно", "ужас", "ужасный", "плохо", "плохой", "плохая", "отвратительно", "отвратный",
    "кошмар", "обман", "обманули", "обманывают", "мошенник", "мошенничество", "мошенники",
    "воры", "воровство", "не вернули", "не возвращают", "верните деньги", "двойное списание",
    "списали дважды", "списали два раза", "брак", "бракованный", "сломан", "сломанный",
    "сломался", "не работает", "хамство", "хамят", "грубо", "грубый", "не отвечают",
    "игнорируют", "задержка", "задержали", "опоздали", "не пришло", "не пришёл", "потеряли",
    "дорого", "переплатил", "скрытые платежи", "некачественный", "некачественно", "грязный",
    "просроченный", "испорчен", "поддержка не отвечает", "развод", "недоволен", "недовольна",
    "проблема", "проблемы", "ошибка", "ошибки", "зависает", "вылетает", "списали",
    "не приходит", "задерживается", "плохая", "плохое", "плохая работа", "ужасная работа",
    "работа не работает",
)

IMPLICIT_COMPLAINTS: tuple[str, ...] = (
    # English
    "hasn't arrived", "has not arrived", "didn't arrive", "did not arrive",
    "where is my order", "where is my money", "where is my refund",
    "wrong address", "still waiting", "no reply", "another delay", "again delay",
    # Azerbaijani
    "pul çıxdı amma", "gəlmədi", "cavab vermir", "haradadır", "yenə gecikmə",
    # Russian
    "не пришёл", "не пришел", "где мой", "жду уже", "никто не отвечает", "опять задержка",
)

POSITIVE: tuple[str, ...] = (
    # English
    "good", "great", "excellent", "amazing", "awesome", "perfect", "love", "loved", "fast",
    "helpful", "friendly", "thanks", "thank", "recommend", "recommended", "best", "satisfied",
    "happy", "wonderful", "nice", "quality", "fair", "reliable", "smooth", "quick", "pleasant",
    "brilliant", "fantastic", "impressed", "responsive", "professional",
    # Azerbaijani
    "yaxşı", "əla", "gözəl", "sürətli", "keyfiyyətli", "təşəkkür", "təşəkkürlər", "sağol",
    "sağ ol", "məmnun", "məmnunam", "məmnun qaldım", "tövsiyə", "tövsiyə edirəm", "ən yaxşı",
    "xoş", "razı", "razıyam", "peşəkar", "mehriban", "kömək etdilər", "bəyəndim", "rahat",
    "etibarlı", "əladır",
    # Russian
    "отлично", "хорошо", "хороший", "замечательно", "спасибо", "рекомендую", "быстро",
    "качественно", "доволен", "довольна", "лучший", "супер", "приятно", "вежливый", "помогли",
    "нравится", "надёжный", "надежный", "удобно",
)

INTENSIFIERS: tuple[str, ...] = (
    "very", "really", "so", "extremely", "super", "totally", "absolutely", "terribly",
    "highly", "çox", "lap", "tamamilə", "tam", "həddinden", "həddindən", "həqiqətən", "очень",
    "слишком", "крайне", "совсем", "вообще", "жутко", "абсолютно", "оч",
)

NEGATIONS: tuple[str, ...] = (
    "not", "no", "never", "without", "don't", "didn't", "doesn't", "isn't", "wasn't", "aren't",
    "yox", "deyil", "heç", "heçvaxt", "olmadı", "olmadım", "не", "нет", "никогда", "ни", "без",
)

SARCASM_POSITIVES: tuple[str, ...] = (
    "just what i needed", "great", "awesome", "amazing", "ну супер", "əla", "lap yaxşı",
)

SARCASM_FAILURES: tuple[str, ...] = (
    "another", "again", "delay", "broken", "missing", "опять", "yenə", "gecikmə",
)


# Actionable signals — a negative mention only becomes a complaint when one is present
# (or when negativity is strong enough).
COMPLAINT_SIGNALS: tuple[str, ...] = (
    # English
    "refund", "refunded", "money", "charged", "charge", "payment", "pay", "invoice", "bill",
    "billing", "warranty", "return", "order", "support", "respond", "response", "reply",
    "broken", "defective", "defect", "crash", "bug", "error", "failed", "failing", "cancel",
    "cancelled", "canceled", "fee", "complaint", "repair", "replace", "subscription", "account",
    "login", "stolen", "delivery", "deliver", "shipment", "customer service", "rude", "crashing",
    # Azerbaijani
    "pul", "pulu", "ödəniş", "hesab", "faktura", "zəmanət", "geri", "sifariş", "çatdırılma",
    "kuryer", "dəstək", "cavab", "zəng", "xarab", "qırıq", "nasaz", "problem", "şikayət",
    "hesabdan", "kobud", "xəta", "donur", "açılmır", "tutdular", "pul çıxdı", "xarab mal",
    # Russian
    "деньги", "платёж", "платеж", "оплата", "счёт", "счет", "гарантия", "возврат", "заказ",
    "доставка", "курьер", "поддержка", "ответ", "сломан", "брак", "ошибка", "отменили",
    "проблема", "верните", "списали", "грубо", "вылетает", "не приходит", "задерживается",
    "плохая работа", "работа не работает",
)

TOPIC_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Billing/Payment": (
        "refund", "refunded", "charge", "charged", "payment", "pay", "invoice", "bill",
        "billing", "fee", "subscription", "double charged", "charged twice", "overcharged",
        "ödəniş", "hesab", "faktura", "pul", "qaytar", "geri qaytar", "возврат", "платёж",
        "платеж", "счёт", "счет", "списал", "деньги", "оплата", "верните", "tutdular",
        "çıxdı pulum", "списали", "списали дважды", "pul çıxdı",
    ),
    "Product Quality": (
        "broken", "damaged", "defective", "defect", "quality", "faulty", "spoiled", "expired",
        "moldy", "torn", "cracked", "xarab", "sınıq", "qırıq", "keyfiyyət", "keyfiyyətsiz",
        "брак", "сломан", "качество", "некачественный", "испорчен", "просроченный", "xarab mal",
    ),
    "Customer Service": (
        "support", "customer service", "service", "agent", "representative", "helpline",
        "respond", "response", "reply", "ignored", "unhelpful", "dəstək", "xidmət", "cavab",
        "zəng", "поддержка", "сервис", "ответ", "обслуживание", "не отвечают", "игнорируют",
        "плохая работа", "ужасная работа",
    ),
    "Delivery/Shipping": (
        "delivery", "deliver", "shipping", "shipped", "shipment", "courier", "delayed", "delay",
        "late", "missing", "lost", "never arrived", "didn't arrive", "did not arrive",
        "çatdırılma", "kuryer", "gecik", "itdi", "gəlmədi", "доставка", "курьер", "задерж",
        "не пришло", "потеряли", "не приходит", "задерживается",
    ),
    "Website/App Bug": (
        "app", "website", "site", "login", "log in", "bug", "error", "crash", "crashed",
        "glitch", "down", "outage", "update", "freeze", "frozen", "sayt", "tətbiq", "proqram",
        "xəta", "сайт", "приложение", "ошибка", "зависает", "вылетает", "не работает", "глючит",
        "donur", "açılmır", "crashing",
    ),
    "Price": (
        "price", "pricing", "expensive", "overpriced", "cost", "costly", "cheaper", "baha",
        "qiymət", "дорого", "цена", "переплатил", "дорогой",
    ),
    "Staff Behavior": (
        "rude", "staff", "employee", "manager", "disrespectful", "aggressive", "shouted",
        "kobud", "işçi", "menecer", "hörmətsiz", "хамство", "грубо", "грубый", "менеджер",
        "сотрудник",
    ),
}


NEGATIVE_EMOJI = ("😡", "😠", "👎", "🤬", "💩", "😤", "😒", "🙄", "😞", "😢", "🤮", "💔", "😣")
POSITIVE_EMOJI = ("😍", "😊", "😃", "👍", "❤️", "❤", "🙌", "🤩", "😁", "🥰", "✨", "💯", "🙏")

AZ_CHARS = set("əığşçöüƏİĞŞÇÖÜ")
CYRILLIC = re.compile(r"[а-яёА-ЯЁ]")


@lru_cache(maxsize=None)
def _term_pattern(term: str) -> re.Pattern[str]:
    # Lookarounds instead of \b so it also works for phrases and non-ASCII letters.
    return re.compile(rf"(?<!\w){re.escape(term)}(?!\w)", re.IGNORECASE)


@lru_cache(maxsize=None)
def _prefixed_pattern(term: str, prefixes: tuple[str, ...]) -> re.Pattern[str]:
    alt = "|".join(re.escape(p) for p in prefixes)
    # prefix, then up to 3 words, then the term
    return re.compile(rf"(?:{alt})\W+(?:\w+\W+){{0,3}}{re.escape(term)}", re.IGNORECASE)


@lru_cache(maxsize=None)
def _suffixed_pattern(term: str, suffixes: tuple[str, ...]) -> re.Pattern[str]:
    alt = "|".join(re.escape(s) for s in suffixes)
    # term, then up to 2 words, then the suffix
    return re.compile(rf"{re.escape(term)}\W+(?:\w+\W+){{0,2}}(?:{alt})", re.IGNORECASE)


def _count(term: str, text: str) -> int:
    return len(_term_pattern(term).findall(text))


def has_actionable_signal(text: str) -> bool:
    """True when the text contains an actionable complaint signal (money, service, ...)."""
    low = (text or "").lower()
    return any(_count(sig, low) for sig in COMPLAINT_SIGNALS)


def detect_language(text: str) -> str:
    if CYRILLIC.search(text):
        return "ru"
    if any(ch in AZ_CHARS for ch in text):
        return "az"
    if _count("yaxşı", text) or _count("pis", text) or _count("şikayət", text):
        return "az"
    return "en"


class RuleAnalyzer(Analyzer):
    """Explainable multilingual rule-based analyzer."""

    def analyze(self, text: str) -> AnalysisResult:
        text = (text or "").strip()
        low = text.lower()

        neg_weight = 0.0
        pos_weight = 0.0

        # Sarcasm heuristic
        is_sarcastic = False
        if any(p in low for p in SARCASM_POSITIVES) and any(f in low for f in SARCASM_FAILURES):
            is_sarcastic = True
            neg_weight += 2.0

        # Typo tolerance helper
        words = re.findall(r"\w+", low)
        
        def count_with_typos(term: str, target_low: str, target_words: list[str]) -> int:
            hits = _count(term, target_low)
            if hits > 0 or len(term) <= 5:
                return hits
            
            # Fuzzy match for long words (avoid small prefix matches like na-razı)
            matches = difflib.get_close_matches(term, target_words, n=1, cutoff=0.92)
            return hits + len(matches)

        for term in NEGATIVE:
            hits = count_with_typos(term, low, words)
            if not hits:
                continue
            
            # Prefix negation (e.g., "not bad", "не очень")
            negated_prefix = len(_prefixed_pattern(term, NEGATIONS).findall(low))

            # Postfix negation check for Azerbaijani (e.g., "pis deyil")
            negated_postfix = len(_suffixed_pattern(term, NEGATIONS).findall(low))
            
            negated = negated_prefix + negated_postfix
            
            # If a negative word is negated, it's actually neutral or positive.
            if negated > 0:
                pos_weight += negated * 0.2
                hits = max(hits - negated, 0)

            boosted = len(_prefixed_pattern(term, INTENSIFIERS).findall(low))
            neg_weight += hits * 1.5 + boosted * 0.8

        for term in IMPLICIT_COMPLAINTS:
            if _count(term, low) > 0:
                neg_weight += 1.5

        for term in POSITIVE:
            hits = count_with_typos(term, low, words)
            if not hits:
                continue
            
            # Prefix negation (e.g., "not good", "не очень")
            negated_prefix = len(_prefixed_pattern(term, NEGATIONS).findall(low))
            
            # Postfix negation (e.g., "yaxşı deyil", "yaxşı olmadı")
            negated_postfix = len(_suffixed_pattern(term, NEGATIONS).findall(low))
            
            negated = negated_prefix + negated_postfix
            plain = max(hits - negated, 0)
            
            boosted = len(_prefixed_pattern(term, INTENSIFIERS).findall(low))
            pos_weight += plain + boosted * 0.5
            neg_weight += negated * 1.5  # Negated positive is very negative

        # Russian specific patterns
        if "не понравилось" in low or "не работает" in low:
            neg_weight += 1.5
        if "не очень" in low:
            neg_weight += 0.5

        for emo in NEGATIVE_EMOJI:
            neg_weight += low.count(emo) * 2.0  # Increased emoji weight
        for emo in POSITIVE_EMOJI:
            pos_weight += low.count(emo) * 0.8

        raw = pos_weight - neg_weight
        score = round(raw / (abs(raw) + 2.0), 3) if raw else 0.0

        if score <= -0.45 or (is_sarcastic and score < 0):
            label = "strongly_negative"
        elif score <= -0.1:
            label = "negative"
        elif score >= 0.15:
            label = "positive"
        else:
            label = "neutral"

        is_complaint = label in ("negative", "strongly_negative") and (
            has_actionable_signal(low) or neg_weight >= 1.5 or is_sarcastic
        )

        return AnalysisResult(
            sentiment_label=label,
            sentiment_score=score,
            is_complaint=is_complaint,
            topic=self._topic(low),
            language=detect_language(text),
        )

    @staticmethod
    def _topic(low: str) -> str:
        best_topic = "Other"
        best_hits = 0
        for topic, terms in TOPIC_KEYWORDS.items():
            hits = sum(_count(term, low) for term in terms)
            if hits > best_hits:
                best_hits = hits
                best_topic = topic
        return best_topic
