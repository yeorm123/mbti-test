# 나의 성격유형 테스트

40문제(7단계 응답)로 16가지 성격유형과 지표별 성향 강도(%)를 알려주고, 결과를 공감 밈 카드로 보여주는 웹 테스트.

- 계획서: [docs/PLAN.md](docs/PLAN.md)
- 레퍼런스: [references/README.md](references/README.md)

## 로컬에서 실행

```bash
cd app
python -m http.server 8000
# 브라우저에서 http://localhost:8000
```

## 문항·결과 수정

- 문항: `app/data/questions.json` (`leftPole` = 왼쪽 문장이 가리키는 글자)
- 유형 설명·궁합·밈: `app/data/types.json`

> 재미로 보는 비공식 테스트입니다. MBTI®는 The Myers-Briggs Company의 상표입니다.
