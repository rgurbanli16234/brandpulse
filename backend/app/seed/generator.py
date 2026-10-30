"""Deterministic demo generator (~300 mentions in EN/AZ/RU).

Produces plausible chatter plus two viral complaint clusters and one fresh spike,
so the dashboard, clustering and alerting all have something to show.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

# --------------------------------------------------------------------------- authors
AUTHORS = {
    "en": ["Emma Clarke", "James Porter", "Olivia Reed", "Noah Bishop", "Mia Dawson", "Liam Foster"],
    "az": ["Leyla Məmmədova", "Kamran Əliyev", "Nigar Həsənli", "Tural İsmayılov", "Aysel Quliyeva", "Rəşad Səfərov"],
    "ru": ["Анна Петрова", "Иван Соколов", "Мария Кузнецова", "Дмитрий Волков", "Ольга Смирнова", "Сергей Попов"],
}

# --------------------------------------------------------------------------- background chatter
BACKGROUND = {
    "en": {
        "positive": [
            "Great coffee and very friendly staff, will come back!",
            "Fast service, loved the new menu.",
            "Excellent quality, highly recommend this place.",
            "Amazing experience, the team was super helpful.",
            "Best brunch in town, thank you!",
            "Nice atmosphere and good prices.",
        ],
        "neutral": [
            "The place was busy today.",
            "Visited on Saturday afternoon, typical crowd.",
            "They opened a new branch near the office.",
            "They changed the opening hours this week.",
            "There was a queue outside this morning.",
        ],
        "negative": [
            "Order arrived late again, not great.",
            "My card was charged twice last month, still waiting for a refund.",
            "The coffee machine was broken and we waited 20 minutes.",
            "The app would not load my order this morning.",
            "The courier left the bag outside and items were damaged.",
            "Prices went up again, quite expensive now.",
        ],
    },
    "az": {
        "positive": [
            "Çox gözəl yer, məmnun qaldım!",
            "Xidmət əla, tövsiyə edirəm.",
            "Sürətli və keyfiyyətli, sağ olun.",
            "Mehriban komanda, bəyəndim.",
            "Ən yaxşı qəhvə Bakıda!",
        ],
        "neutral": [
            "Bu gün dolu idi.",
            "Yeni filial açıldı.",
            "İş saatları dəyişdi.",
            "Səhər növbə görmüşəm.",
            "Şənbə günü getdik.",
        ],
        "negative": [
            "Sifariş yenə gecikdi, yaxşı deyil.",
            "Kartdan iki dəfə pul tutulub, hələ də qaytarmırlar.",
            "Kassa işləmirdi, 20 dəqiqə gözlədik.",
            "Tətbiq açılmadı, sifariş verə bilmədim.",
            "Kuryer çatdırılmanı gecikdirdi və məhsul qırılıb.",
            "Qiymətlər çox baha olub.",
        ],
    },
    "ru": {
        "positive": [
            "Отличный кофе и дружелюбный персонал!",
            "Быстро и качественно, рекомендую.",
            "Замечательное место, спасибо!",
            "Супер обслуживание, вернусь снова.",
            "Лучший завтрак в городе.",
        ],
        "neutral": [
            "Сегодня было много людей.",
            "Открыли новый филиал.",
            "Изменили часы работы.",
            "Утром была очередь.",
            "Заходили в субботу.",
        ],
        "negative": [
            "Заказ опять опоздал, не очень.",
            "Списали дважды, до сих пор не вернули деньги.",
            "Кофемашина не работала, ждали 20 минут.",
            "Приложение не работает, не смог оформить заказ.",
            "Курьер оставил пакет у двери, товар повреждён.",
            "Цены опять выросли, дорого.",
        ],
    },
}

# --------------------------------------------------------------------------- viral clusters
CLUSTER_BILLING = {
    "en": [
        "They double charged my card for the subscription and the refund never arrived. Total scam.",
        "Charged twice for one order and support will not refund my money.",
        "My card was charged twice and nobody answers support. Avoid this place!",
        "Double charged and still waiting for a refund two weeks later.",
    ],
    "az": [
        "Kartdan iki dəfə pul tutdular və qaytarmırlar. Rezil xidmət!",
        "Abunə üçün iki dəfə ödəniş tutulub, geri qaytarmırlar. Aldadıcıdır!",
        "İki dəfə pul çıxıb, dəstək cavab vermir və qaytarmırlar!",
    ],
    "ru": [
        "Списали дважды за подписку и не возвращают деньги. Обман!",
        "Двойное списание, поддержка не отвечает, верните деньги!",
        "Списали деньги дважды, возврат так и не пришёл. Мошенники!",
    ],
}

CLUSTER_DELIVERY = {
    "en": [
        "Delivery arrived late and the package was damaged, no refund offered.",
        "The courier lost my order and customer service will not respond.",
        "My order never arrived and support ignores my messages.",
    ],
    "az": [
        "Sifariş gəlmədi və kuryer itirdi, dəstək cavab vermir.",
        "Çatdırılma gecikdi və məhsul qırılıb, geri qaytarmırlar.",
        "Sifarişim gəlmədi, dəstək cavab vermir.",
    ],
    "ru": [
        "Заказ не пришёл, курьер потерял посылку, поддержка не отвечает.",
        "Доставка задержалась, товар повреждён, возврат не сделали.",
        "Заказ потеряли и поддержка не отвечает.",
    ],
}

CLUSTER_APP = {
    "en": [
        "The app is down again and the order page will not load.",
        "Website crashed during checkout, I cannot complete my order.",
        "The app keeps crashing with an error when I try to pay.",
        "Login is broken, the payment page gives an error every time.",
    ],
    "az": [
        "Tətbiq yenə işləmir, sifariş səhifəsi açılmır.",
        "Sayt ödəniş zamanı çökdü, sifariş verə bilmirəm.",
        "Tətbiqdə ödəniş edəndə xəta çıxır, işləmir.",
    ],
    "ru": [
        "Приложение снова не работает, страница заказа не грузится.",
        "Сайт вылетает при оплате, не могу оформить заказ.",
        "Приложение зависает, ошибка при оплате.",
    ],
}

DETAILS = ["again", "this morning", "last night", "on Saturday", "twice now", "for the third time", "near the office"]
LANGS = ("en", "az", "ru")


def _as_utc_naive(dt: datetime) -> datetime:
    return dt


def generate_mentions(now: datetime | None = None, target: int = 300, seed: int = 42) -> list[dict]:
    """Return ~``target`` realistic mentions with clusters and one spike."""
    rng = random.Random(seed)
    now = now or datetime.now(timezone.utc)
    used: set[str] = set()
    rows: list[dict] = []

    def emit(text: str, language: str, created_at: datetime, followers: int, engagement: int) -> None:
        key = " ".join(text.lower().split())
        if key in used:
            for _ in range(6):
                candidate = f"{text} ({rng.choice(DETAILS)})"
                if " ".join(candidate.lower().split()) not in used:
                    text = candidate
                    key = " ".join(text.lower().split())
                    break
            else:
                text = f"{text} #{len(rows)}"
                key = " ".join(text.lower().split())
        used.add(key)
        index = len(rows)
        rows.append(
            {
                "source": "demo",
                "text": text,
                "author": rng.choice(AUTHORS[language]),
                "author_followers": followers,
                "url": f"https://demo.brandpulse.app/post/{index}",
                "created_at": created_at,
                "engagement": engagement,
                "external_id": f"demo-{index}",
                "language": language,
            }
        )

    # --- background chatter spread across the last 14 days (~250 mentions) ---
    buckets = ("positive", "positive", "neutral", "neutral", "negative")
    while len(rows) < target - 62:
        language = rng.choice(LANGS)
        text = rng.choice(BACKGROUND[language][rng.choice(buckets)])
        days_ago = rng.randint(0, 13)
        created_at = now - timedelta(days=days_ago, hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
        emit(text, language, created_at, rng.choice([0, 40, 120, 350, 900, 2500]), rng.randint(0, 120))

    # --- viral cluster A: billing / double charge (last 8 hours) ---
    for i in range(20):
        language = LANGS[i % 3]
        created_at = now - timedelta(minutes=rng.randint(5, 480))
        emit(rng.choice(CLUSTER_BILLING[language]), language, created_at, rng.choice([1200, 4800, 12000, 21000, 60000]), rng.randint(20, 400))

    # --- viral cluster B: delivery / lost package (last ~2 days) ---
    for i in range(16):
        language = LANGS[i % 3]
        created_at = now - timedelta(hours=rng.randint(2, 40))
        emit(rng.choice(CLUSTER_DELIVERY[language]), language, created_at, rng.choice([300, 1500, 5200, 9000]), rng.randint(10, 250))

    # --- live spike: app/website outage (last ~75 minutes) ---
    for i in range(26):
        language = LANGS[i % 3]
        created_at = now - timedelta(minutes=rng.randint(1, 75))
        emit(rng.choice(CLUSTER_APP[language]), language, created_at, rng.choice([0, 200, 900, 4000, 15000]), rng.randint(0, 150))

    return rows


__all__ = ["generate_mentions"]
