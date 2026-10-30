import pytest
from app.analyzers.rules import RuleAnalyzer

analyzer = RuleAnalyzer()

@pytest.mark.parametrize(
    ("text", "exp_label", "exp_complaint", "exp_lang"),
    [
        # English
        ("App keeps crashing on login.", "negative", True, "en"),
        ("The staff was extremely rude to me.", "strongly_negative", True, "en"),
        ("This is not bad at all.", "neutral", False, "en"),
        
        # Azerbaijani
        ("Pulumu iki dəfə tutdular, bu nədir?", "strongly_negative", True, "az"),
        ("Tətbiq login olanda xəta verir.", "negative", True, "az"),
        ("İşçilər çox kobud rəftar edirlər.", "negative", True, "az"),
        ("Xidmət yaxşı deyil.", "negative", True, "az"),
        ("Hə, əla, yenə xarab mal gəldi.", "negative", True, "az"),
        ("Pis deyil.", "neutral", False, "az"),
        
        # Russian
        ("Списали деньги дважды, верните!", "strongly_negative", True, "ru"),
        ("Доставка задерживается, где мой заказ?", "negative", True, "ru"),
        ("Приложение постоянно вылетает при входе.", "negative", True, "ru"),
        ("Персонал ведет себя очень грубо.", "negative", True, "ru"),
        ("Не хорошо", "negative", True, "ru"),
        ("Ну супер, опять прислали брак.", "negative", True, "ru"),
        ("оч плохая работа", "negative", True, "ru"),
    ],
)
def test_analyzer_regression(text, exp_label, exp_complaint, exp_lang):
    res = analyzer.analyze(text)
    
    # We allow some flexibility between negative and strongly_negative
    if exp_label in ("negative", "strongly_negative"):
        assert res.sentiment_label in ("negative", "strongly_negative")
    else:
        assert res.sentiment_label == exp_label
        
    assert res.is_complaint == exp_complaint
    assert res.language == exp_lang
