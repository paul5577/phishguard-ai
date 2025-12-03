import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const SYSTEM_INSTRUCTION = `
너는 보이스피싱 번호 탐지 전문 AI 어시스턴트다.

[목표]
사용자가 입력한 전화번호에 대해 다음 5가지를 반드시 수행한다:
1) 전화번호 정규화(하이픈/공백 제거)
2) 패턴 기반 위험도 분석(0~100점)
3) 보이스피싱 여부 카테고리 분류
4) 3줄 요약 + 5줄 상세 설명 생성
5) 권장 행동 가이드 제시

[전화번호 정규화 규칙]
- 0~9 숫자 외 모든 문자 제거
- 한국 번호면 지역번호/휴대폰 패턴 인식
- 해외 번호는 그대로 유지(E.164 참고)

[카테고리 분류]
- 0~39점 → 🟢 일반 전화 가능성 높음
- 40~69점 → 🟡 홍보/마케팅 의심
- 70~100점 → 🔴 보이스피싱 강력 의심

[분석 기준]
- 지역번호 위험 클러스터
- 최근 3개월 신고 패턴(설명형 시뮬레이션 OK)
- 금융·대출·검찰 사칭 패턴 유사도
- 발신 시간대 및 빈도(예측)
- 자동발신/콜센터 패턴 매칭

[출력 형식(JSON)]
{
  "normalizedNumber": "정규화된 번호",
  "riskScore": 0,
  "category": "카테고리 명칭 (이모지 포함)",
  "summary": ["요약1", "요약2", "요약3"],
  "details": ["상세1", "상세2", "상세3", "상세4", "상세5"],
  "actionGuide": "구체적인 행동 가이드",
  "closingMessage": "따뜻한 감성 메시지"
}

설명은 모두 한국어로 작성한다.
`;

export const analyzePhoneNumber = async (phoneNumber: string, customApiKey?: string): Promise<AnalysisResult> => {
  try {
    // 사용자가 입력한 키가 있으면 그것을 우선 사용, 없으면 환경변수 사용
    const apiKeyToUse = customApiKey || process.env.API_KEY;
    
    if (!apiKeyToUse) {
        throw new Error("API Key가 설정되지 않았습니다. 설정 메뉴에서 키를 입력해주세요.");
    }

    const ai = new GoogleGenAI({ apiKey: apiKeyToUse });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `분석할 전화번호: ${phoneNumber}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            normalizedNumber: { type: Type.STRING, description: "정규화된 전화번호 포맷" },
            riskScore: { type: Type.INTEGER, description: "0에서 100 사이의 위험도 점수" },
            category: { type: Type.STRING, description: "분류 결과 (이모지 포함)" },
            summary: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "분석 결과 3줄 요약"
            },
            details: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "5줄 상세 분석 내용 (분석 근거)"
            },
            actionGuide: { type: Type.STRING, description: "사용자가 취해야 할 구체적인 행동 가이드" },
            closingMessage: { type: Type.STRING, description: "안부 인사 및 안전 기원 메시지" }
          },
          required: ["normalizedNumber", "riskScore", "category", "summary", "details", "actionGuide", "closingMessage"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text received from AI");
    }

    const result = JSON.parse(response.text) as AnalysisResult;
    return result;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};