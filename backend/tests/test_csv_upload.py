"""CSV import tests: required column, idempotency, per-row analysis."""

from __future__ import annotations

from fastapi.testclient import TestClient

API = "/api/v1"

CSV_WITH_HEADER = (
    "text,author,author_followers,engagement,external_id\n"
    "Acme double charged my credit card and support never replied,Emma Clarke,1200,40,csv-1\n"
    "\"Great coffee and very friendly staff, thank you!\",James Porter,300,12,csv-2\n"
)

MESSY_NUMBERS = (
    "text,author,author_followers,engagement\n"
    "My invoice shows a hidden fee and nobody replies,Aisha Khan,n/a,many\n"
    "The courier lost my order and support ignored me,Tom Lee,1.5e3,20\n"
)

HEADERLESS_TEXT_ONLY = (
    "text\n"
    "The delivery never arrived and the courier was rude to me\n"
)


def upload(client: TestClient, auth: dict[str, str], content: str, filename: str = "mentions.csv"):
    return client.post(
        f"{API}/mentions/upload-csv",
        headers=auth,
        files={"file": (filename, content.encode("utf-8"), "text/csv")},
    )


def test_csv_import_creates_and_analyzes_mentions(client: TestClient, auth: dict[str, str]) -> None:
    response = upload(client, auth, CSV_WITH_HEADER)
    assert response.status_code == 200
    body = response.json()
    assert body["imported"] == 2
    assert body["skipped"] == 0

    mentions = client.get(f"{API}/mentions", headers=auth).json()
    assert len(mentions) == 2
    assert {mention["source"] for mention in mentions} == {"csv"}

    complaint = next(mention for mention in mentions if mention["is_complaint"])
    assert complaint["sentiment_label"] in {"negative", "strongly_negative"}
    assert complaint["thread_id"] is not None
    assert complaint["author"] == "Emma Clarke"
    assert complaint["author_followers"] == 1200
    assert complaint["engagement"] == 40


def test_csv_reupload_skips_duplicates(client: TestClient, auth: dict[str, str]) -> None:
    assert upload(client, auth, CSV_WITH_HEADER).json()["imported"] == 2

    second = upload(client, auth, CSV_WITH_HEADER).json()
    assert second["imported"] == 0
    assert second["skipped"] == 2
    assert len(client.get(f"{API}/mentions", headers=auth).json()) == 2


def test_csv_rows_without_external_id_dedupe_by_content(client: TestClient, auth: dict[str, str]) -> None:
    assert upload(client, auth, HEADERLESS_TEXT_ONLY).json()["imported"] == 1

    again = upload(client, auth, HEADERLESS_TEXT_ONLY).json()
    assert again["imported"] == 0
    assert again["skipped"] == 1


def test_csv_requires_a_text_column(client: TestClient, auth: dict[str, str]) -> None:
    response = upload(client, auth, "author,engagement\nEmma,10\n")
    assert response.status_code == 400
    assert "text" in response.json()["detail"]


def test_csv_tolerates_malformed_numeric_cells(client: TestClient, auth: dict[str, str]) -> None:
    body = upload(client, auth, MESSY_NUMBERS)
    assert body.status_code == 200
    assert body.json()["imported"] == 2

    utterances = {mention["author"]: mention for mention in client.get(f"{API}/mentions", headers=auth).json()}
    assert utterances["Aisha Khan"]["author_followers"] == 0
    assert utterances["Aisha Khan"]["engagement"] == 0
    assert utterances["Tom Lee"]["author_followers"] == 1500


def test_csv_tolerates_blank_lines_and_odd_columns(client: TestClient, auth: dict[str, str]) -> None:
    content = (
        "Author,Text,Extra\n"
        "Emma,\"My card was charged twice, still waiting for a refund\",x\n"
        ",\n"
    )
    body = upload(client, auth, content).json()
    assert body["imported"] == 1
    assert body["skipped"] == 1
