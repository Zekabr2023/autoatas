
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MinutesTemplate } from '../types';

function getGenAIClient() {
  const userApiKey = localStorage.getItem('geminiApiKey');
  const apiKey = userApiKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("A chave de API do Gemini não foi encontrada. Por favor, configure-a nas configurações ou como uma variável de ambiente.");
  }
  return new GoogleGenAI({ apiKey });
}

const MEDIA_DIARIZATION_PROMPT = `
Sua tarefa é transcrever o conteúdo de áudio do arquivo de mídia fornecido e realizar a diarização, identificando cada orador.

**REGRAS OBRIGATÓRIAS:**
1. Atribua rótulos genéricos e consistentes como 'Orador 1:', 'Orador 2:', 'Síndico:', etc., antes de cada fala.
2. NUNCA gere labels de oradores vazios ou sem texto depois.
3. Se não houver fala audível, pule para a próxima fala com conteúdo.
4. NUNCA repita labels em sequência sem conteúdo entre eles.
5. O resultado final deve conter APENAS texto transcrito com seus respectivos oradores.

Responda APENAS com o texto da transcrição diarizada, sem nenhum comentário ou introdução.
Se houver silêncio prolongado no áudio, simplesmente pule essa parte.
`;

const MINUTES_GENERATION_PROMPT_FORMAL = `
Você é um secretário profissional especializado em redigir o corpo de atas de reuniões de condomínio.
Com base na transcrição da reunião fornecida, gere o conteúdo de uma "Ata de Reunião de Condomínio" formal, clara e concisa em Português do Brasil.

O conteúdo da ata deve seguir estritamente a seguinte estrutura e formatação:

**ATA DA 14ª ASSEMBLEIA GERAL ORDINÁRIA DO CONDOMÍNIO {condoName}**
**CNPJ: [SE NECESSÁRIO, INSERIR CNPJ]**

[Parágrafo de abertura: Ex: "Aos [data], às [hora], em [formato], realizou-se a Assembleia Geral..."]

**1. ORDEM DO DIA (AGENDA):**
- Liste os principais tópicos discutidos na reunião, extraídos da transcrição, usando marcadores (hífens).

**2. PRESENTES:**
- Mencione que a lista de presença encontra-se em anexo (texto padrão).

**3. DELIBERAÇÕES:**
- Para cada item da Ordem do Dia, descreva a discussão e a decisão tomada.
- **Use negrito (com asteriscos, ex: **Aprovado**) para destacar as principais ações e decisões (ex: aprovado, reprovado, eleito, adiado).**
- **Use listas com marcadores (hífens) para detalhar pontos discutidos, candidatos ou itens votados, quando aplicável.**
- Exemplo de formatação:
  - **Aprovação de Contas:** As contas do período foram apresentadas. Após esclarecimentos sobre a manutenção dos elevadores, as contas foram **aprovadas** pela maioria.
  - **Eleição de Síndico:** Foram apresentados os candidatos:
    - Sra. Helena (Apto 301)
    - Sr. Roberto (Apto 504)
    - Após votação, a Sra. Helena foi **eleita** como nova síndica para o próximo mandato.
  - **Instalação de Mercado Autônomo:** Discutiu-se a proposta da empresa 'MarketInBox'. Foram levantados os seguintes pontos:
    - Praticidade para os moradores.
    - Questões de segurança e acesso.
    - Custos de instalação e manutenção.
    - Foi **aprovado** um período de teste de 3 meses para a solução.

**4. ENCERRAMENTO:**
- Escreva um parágrafo de encerramento padrão, informando que nada mais havendo a tratar, a reunião foi encerrada e a presente ata será assinada.

Use a transcrição abaixo como fonte de informação. Seja objetivo, formal e aplique rigorosamente a formatação solicitada.
Responda APENAS com o conteúdo do corpo da ata, sem cabeçalhos de data/hora/local e sem introduções ou comentários.

Transcrição da Reunião:
---
{diarizedTranscript}
---
`;

const MINUTES_GENERATION_PROMPT_SUMMARY = `
Você é um assistente de IA focado em produtividade. Sua tarefa é criar um **Resumo Executivo** da reunião de condomínio com base na transcrição fornecida. O resumo deve ser conciso e direto ao ponto.

**Instruções:**
1.  Identifique e liste APENAS as **decisões finais** tomadas.
2.  Liste quaisquer **ações ou tarefas** que foram delegadas, indicando o responsável se possível.
3.  Use marcadores (bullet points) para clareza.
4.  Ignore discussões gerais e foque nos resultados.
5.  Responda APENAS com o resumo, sem introduções ou comentários.

**Exemplo de Formato:**

**RESUMO EXECUTIVO DA REUNIÃO**
**CONDOMÍNIO {condoName}**

**Decisões Principais:**
- Contas do semestre anterior foram **aprovadas**.
- Sra. Helena foi **eleita** como nova síndica.
- **Aprovado** um período de teste de 3 meses para o mercado autônomo.

**Próximos Passos / Ações:**
- A nova síndica, Sra. Helena, deve buscar novos fornecedores de manutenção.

Use a transcrição abaixo:
---
{diarizedTranscript}
---
`;

const MINUTES_GENERATION_PROMPT_AGENDA = `
Você é um secretário de reuniões de alta performance. Sua tarefa é gerar um documento de **Pauta com Deliberações** com base na transcrição da reunião de condomínio. O formato deve ser claro e seguir a ordem dos tópicos discutidos.

**Instruções:**
1.  Identifique cada item principal da pauta (agenda) discutido na reunião.
2.  Para cada item, escreva um título claro (ex: "1. Aprovação de Contas").
3.  Abaixo de cada título, escreva um parágrafo curto resumindo a discussão.
4.  Conclua cada seção com a deliberação final em negrito (ex: **Deliberação: Aprovado por unanimidade.**).
5.  Responda APENAS com a pauta, sem introduções ou comentários.

**Exemplo de Formato:**

**PAUTA COM DELIBERAÇÕES**
**CONDOMÍNIO {condoName}**

**1. Aprovação das Contas**
Foram apresentadas as contas do último semestre. Houve um questionamento sobre os custos de manutenção dos elevadores, que foi esclarecido como um gasto emergencial necessário.
**Deliberação: As contas foram aprovadas pela maioria dos presentes.**

**2. Eleição de Síndico**
A Sra. Helena e o Sr. Roberto se apresentaram como candidatos. A Sra. Helena focou em comunicação e custos, enquanto o Sr. Roberto focou em infraestrutura.
**Deliberação: A Sra. Helena foi eleita a nova síndica.**

Use a transcrição abaixo:
---
{diarizedTranscript}
---
`;

const PROMPTS = {
  [MinutesTemplate.FORMAL]: MINUTES_GENERATION_PROMPT_FORMAL,
  [MinutesTemplate.SUMMARY]: MINUTES_GENERATION_PROMPT_SUMMARY,
  [MinutesTemplate.AGENDA]: MINUTES_GENERATION_PROMPT_AGENDA,
};

// Helper function to convert Blob to a GoogleGenerativeAI.Part
async function blobToGenerativePart(blob: Blob) {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(blob);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: blob.type || 'audio/webm', // Fallback MIME type
    },
  };
}

function handleGeminiError(error: unknown, context: string): never {
  console.error(`Error in ${context}:`, error);

  if (error instanceof Error && error.message) {
    if (error.message.includes('API key not valid')) {
      throw new Error("A chave de API é inválida. Verifique suas credenciais e se a API Google AI está ativada em seu projeto.");
    }
    if (error.message.includes('429')) {
      throw new Error("A cota de uso da API foi excedida. Por favor, tente novamente mais tarde.");
    }
    if (error.message.toLowerCase().includes('token limit') || error.message.includes('size limit')) {
      throw new Error("O arquivo de mídia fornecido é muito longo ou complexo para ser processado. Tente um arquivo menor.");
    }
  }

  const operation = context === 'diarizeTranscript' ? 'diarização da transcrição' : 'geração da ata';
  throw new Error(`Ocorreu um erro na ${operation}. Por favor, tente novamente.`);
}

export async function diarizeTranscript(mediaBlobs: Blob[]): Promise<GenerateContentResponse> {
  try {
    const ai = getGenAIClient();
    const mediaParts = await Promise.all(
      mediaBlobs.map(blob => blobToGenerativePart(blob))
    );

    const contents = [...mediaParts, { text: MEDIA_DIARIZATION_PROMPT }];

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite-001',
      contents: [{ parts: contents }],
    });
    return response;
  } catch (error) {
    handleGeminiError(error, "diarizeTranscript");
  }
}

export async function generateMinutes(diarizedTranscript: string, condoName: string, template: MinutesTemplate): Promise<GenerateContentResponse> {
  try {
    const ai = getGenAIClient();
    const finalCondoName = condoName.trim() === '' ? 'Edifício Barão do Rio Branco' : condoName.trim();
    const basePrompt = PROMPTS[template] || PROMPTS[MinutesTemplate.FORMAL];
    const prompt = basePrompt
      .replace('{diarizedTranscript}', diarizedTranscript)
      .replace(/{condoName}/g, finalCondoName);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response;
  } catch (error) {
    handleGeminiError(error, "generateMinutes");
  }
}
