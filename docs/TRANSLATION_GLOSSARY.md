# BrandPulse — Translation glossary

Source of truth for every UI string in English (`en`), Azerbaijani (`az`, Latin script)
and Russian (`ru`).

Rules:

- **The brand name `BrandPulse` is never translated.**
- Product names, code values (backend enums, route paths, slugs) and URLs stay in English.
- Azerbaijani uses the Latin alphabet with the correct letters (ə, ğ, ı, ö, ü, ş, ç, İ)
  and the formal **"siz"** form.
- Russian uses the formal **"вы"** form.
- Wording must read naturally for a small-business owner, not word-for-word machine output.
- Keep the honest-copy rules: no invented statistics, customers or testimonials.
  "Sample data" and "Soon" stay as labels and are translated.

## Core vocabulary

| English | Azerbaijani | Russian |
| --- | --- | --- |
| mention | qeyd | упоминание |
| complaint | şikayət | жалоба |
| sentiment | əhval-ruhiyyə (tonallıq) | тональность |
| incident thread | hadisə qrupu | группа инцидентов |
| alert | xəbərdarlıq | оповещение |
| dashboard | idarə paneli | панель управления |
| priority Low / Medium / High / Critical | Aşağı / Orta / Yüksək / Kritik | Низкий / Средний / Высокий / Критический |
| sign up / log in | Qeydiyyat / Daxil ol | Регистрация / Войти |
| pricing | Qiymətlər | Цены |

## Sentiment labels (`sentiment_label`)

| Code value | English | Azerbaijani | Russian |
| --- | --- | --- | --- |
| `strongly_negative` | Strongly negative | Çox mənfi | Резко негативная |
| `negative` | Negative | Mənfi | Негативная |
| `neutral` | Neutral | Neytral | Нейтральная |
| `positive` | Positive | Müsbət | Позитивная |

## Topics (`topic`)

| Code value | English | Azerbaijani | Russian |
| --- | --- | --- | --- |
| `Billing/Payment` | Billing / Payment | Ödəniş / Hesablaşma | Оплата и счета |
| `Product Quality` | Product Quality | Məhsulun keyfiyyəti | Качество товара |
| `Customer Service` | Customer Service | Müştəri xidməti | Обслуживание клиентов |
| `Delivery/Shipping` | Delivery / Shipping | Çatdırılma / Kuryer | Доставка |
| `Website/App Bug` | Website / App Bug | Sayt / Tətbiq xətası | Ошибка на сайте или в приложении |
| `Price` | Price | Qiymət | Цена |
| `Staff Behavior` | Staff Behavior | İşçilərin davranışı | Поведение сотрудников |
| `Other` | Other | Digər | Другое |

## Thread status (`status`)

| Code value | English | Azerbaijani | Russian |
| --- | --- | --- | --- |
| `open` | Open | Açıq | Открыт |
| `investigating` | Investigating | Araşdırılır | В работе |
| `resolved` | Resolved | Həll olunub | Решён |

## Sources (`source`)

| Code value | English | Azerbaijani | Russian |
| --- | --- | --- | --- |
| `csv` | CSV upload | CSV yükləmə | Загрузка CSV |
| `manual` | Manual entry | Əl ilə daxil edilmiş | Добавлено вручную |
| `reddit` | Reddit | Reddit | Reddit |
| `rss` | RSS feed | RSS lenti | RSS-лента |
| `demo` | Demo data | Demo məlumatı | Демо-данные |

## Keyword types (`KeywordType`)

| Code value | English | Azerbaijani | Russian |
| --- | --- | --- | --- |
| `brand` | Brand | Brend | Бренд |
| `product` | Product | Məhsul | Продукт |
| `executive` | Executive | Rəhbər | Руководитель |
| `typo` | Typo | Yazı səhvi | Опечатка |
| `competitor` | Competitor | Rəqib | Конкурент |

## Mention languages (sample data tags)

| Tag | English | Azerbaijani | Russian |
| --- | --- | --- | --- |
| `EN` | English | İngilis dili | Английский |
| `AZ` | Azerbaijani | Azərbaycan dili | Азербайджанский |
| `RU` | Russian | Rus dili | Русский |

## Recurring UI wording

| English | Azerbaijani | Russian |
| --- | --- | --- |
| Sample data | Nümunə məlumat | Демо-данные |
| Soon | Tezliklə | Скоро |
| Try again | Yenidən yoxlayın | Повторить |
| Go home | Ana səhifəyə qayıt | На главную |
| Sign out | Çıxış | Выйти |
| Dashboard | İdarə paneli | Панель управления |
| Mentions | Qeydlər | Упоминания |
| Incident Threads | Hadisə qrupları | Группы инцидентов |
| Alerts | Xəbərdarlıqlar | Оповещения |
| Analyze Playground | Analiz meydançası | Песочница анализа |
| Settings | Parametrlər | Настройки |
| Product | Məhsul | Продукт |
| Features | İmkanlar | Возможности |
| How it works | Necə işləyir | Как это работает |
| Use cases | İstifadə halları | Сценарии использования |
| Blog | Bloq | Блог |
| Login | Daxil ol | Войти |
| Start trial | Sınağa başla | Начать пробный период |
| Language | Dil | Язык |

## Notes on terminology choices

- **sentiment** → Azerbaijani `əhval-ruhiyyə` with `tonallıq` in brackets on first use
  (the concept is unfamiliar; the bracket helps orientation).
- **thread status `investigating`** → Azerbaijani `Araşdırılır`, Russian `В работе`
  (a business owner's wording, not the literal translation).
- **`Billing/Payment`** → Azerbaijani `Ödəniş / Hesablaşma`, Russian `Оплата и счета`.
- Russian is typically 20–30% longer than English; layouts are fixed, not the text.
