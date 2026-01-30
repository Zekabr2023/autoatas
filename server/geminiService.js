import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

// Prompts (ported from frontend)
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
Você é um secretário profissional altamente qualificado, especializado em redigir atas de assembleias de condomínios residenciais no Brasil. Sua tarefa é gerar uma ata COMPLETA, DETALHADA e PROFISSIONAL com base na transcrição da reunião fornecida.

**IMPORTANTE:** A ata deve ser MUITO DETALHADA, capturando:
- TODAS as falas relevantes dos participantes, identificando-os pelo nome/unidade quando possível
- Os argumentos, opiniões, sugestões e questionamentos apresentados por cada participante
- Números, valores, datas, prazos e quaisquer dados quantitativos mencionados
- Votações com contagem de votos (aprovados, reprovados, abstenções) quando houver
- O fluxo natural da discussão, incluindo debates e esclarecimentos

**ESTRUTURA OBRIGATÓRIA DA ATA:**

1. **CABEÇALHO E ABERTURA:**
   - Título: "ATA DA [NÚMERO]ª ASSEMBLEIA GERAL [ORDINÁRIA/EXTRAORDINÁRIA] DO CONDOMÍNIO {condoName}"
   - Parágrafo de abertura extenso contendo:
     * Data por extenso (ex: "Aos vinte e oito dias do mês de julho...")
     * Local e formato da reunião (presencial/virtual)
     * Referência ao Edital de Convocação
     * Horário de início e chamada (1ª ou 2ª chamada)
     * Menção à lista de presença e unidades representadas

2. **ELEIÇÃO DE MESA:**
   - Presidente e Secretário da assembleia
   - Resultado da eleição (por unanimidade ou votação)

3. **ORDEM DO DIA:**
   - Liste TODOS os itens da pauta numerados (1.º, 2.º, 3.º, etc.)

4. **DELIBERAÇÕES (SEÇÃO PRINCIPAL E MAIS EXTENSA):**
   Para CADA item da pauta, escreva uma seção detalhada incluindo:
   
   a) **Apresentação do tema** - Quem apresentou e o que foi explicado
   
   b) **Discussão** - Transcreva de forma narrativa as intervenções dos participantes:
      - "O Sr./Sra. [Nome] ([Unidade]) questionou/sugeriu/informou que..."
      - "Em resposta, o Sr./Sra. [Nome] esclareceu que..."
      - Inclua valores monetários, prazos, percentuais mencionados
      - Capture objeções, apoios, sugestões de alteração
   
   c) **Esclarecimentos técnicos** - Explicações de profissionais, síndicos ou administradora
   
   d) **Votação e Resultado** (quando aplicável):
      - "Feitos todos os esclarecimentos, o item foi colocado em votação, obtendo-se o seguinte resultado:"
      - "Aprovo: X votos (fração ideal: X.XX)"
      - "Reprovo: X votos (fração ideal: X.XX)"  
      - "Abstenção: X votos (fração ideal: X.XX)"
      - "Ao final da apuração, o item foi **APROVADO/REPROVADO** pela maioria."

5. **ASSUNTOS GERAIS:**
   - Registre sugestões, reclamações, informes adicionais

6. **ENCERRAMENTO:**
   - "Nada mais havendo para deliberar, o presidente agradeceu a participação de todos, encerrando os trabalhos às [HORA]. [Cidade], [Data]."
   - NÃO inclua campos de assinatura, espaços para assinatura ou menção a "assinado por" - isso será adicionado separadamente pelo sistema.

**REGRAS DE FORMATAÇÃO:**
- Use negrito para destacar: **APROVADO**, **REPROVADO**, **ELEITO**, nomes de participantes na primeira menção
- Escreva números por extenso seguidos do numeral entre parênteses: "R$ 2.000.000,00 (dois milhões de reais)"
- Identifique participantes como "Sr./Sra. [Nome] ([Unidade])" na primeira menção
- Mantenha tom formal e jurídico, típico de documentos oficiais brasileiros
- Use vírgulas e pontuação adequada para parágrafos longos e bem estruturados

**QUALIDADE ESPERADA:**
A ata deve ter no mínimo 2.000 palavras para reuniões longas, capturando a essência e os detalhes de todas as discussões. NÃO resuma excessivamente. Seja prolixo e detalhado como um secretário profissional.

Responda APENAS com o conteúdo da ata, sem comentários, introduções ou observações suas.

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
2.  Para cada título, escreva um título claro (ex: "1. Aprovação de Contas").
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
    'formal': MINUTES_GENERATION_PROMPT_FORMAL,
    'summary': MINUTES_GENERATION_PROMPT_SUMMARY,
    'agenda': MINUTES_GENERATION_PROMPT_AGENDA,
};

// Segment size for audio processing (~10MB per segment = ~10-15 min of MP3 audio)
// Smaller segments = more API calls but more complete transcription per segment
const SEGMENT_SIZE_BYTES = 10 * 1024 * 1024;

// Chunk size within each segment (~3.9MB per inline data part)
const CHUNK_SIZE_BYTES = 3.9 * 1024 * 1024;

// Rate limiting configuration
const COOLDOWN_AFTER_SEGMENTS = 5; // Wait after every N segments
const COOLDOWN_DURATION_MS = 60 * 1000; // 1 minute cooldown
const MAX_RETRIES = 3; // Max retries for rate-limited requests
const RETRY_BASE_DELAY_MS = 60 * 1000; // 60 seconds base delay for retry

/**
 * Sleep helper
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Read audio file and split into segments for processing
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<{segments: Buffer[], mimeType: string, totalSize: number}>}
 */
async function splitAudioIntoSegments(audioPath) {
    const buffer = await fs.readFile(audioPath);
    const mimeType = audioPath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/webm';

    const segments = [];
    for (let i = 0; i < buffer.length; i += SEGMENT_SIZE_BYTES) {
        segments.push(buffer.subarray(i, Math.min(i + SEGMENT_SIZE_BYTES, buffer.length)));
    }

    return { segments, mimeType, totalSize: buffer.length };
}

/**
 * Convert a buffer segment to Gemini inline data parts
 * @param {Buffer} segment - Audio segment buffer
 * @param {string} mimeType - Audio MIME type
 * @returns {Array<{inlineData: {data: string, mimeType: string}}>}
 */
function segmentToGenerativeParts(segment, mimeType) {
    const parts = [];
    for (let i = 0; i < segment.length; i += CHUNK_SIZE_BYTES) {
        const chunk = segment.subarray(i, Math.min(i + CHUNK_SIZE_BYTES, segment.length));
        parts.push({
            inlineData: {
                data: chunk.toString('base64'),
                mimeType: mimeType,
            },
        });
    }
    return parts;
}

/**
 * Transcribe audio file using Gemini - processes in segments for long audio
 * @param {string} audioPath - Path to audio file
 * @param {string} apiKey - Decrypted Gemini API key
 * @param {(progress: {percentage: number, stage: string}) => void} onProgress - Progress callback
 * @returns {Promise<{text: string, usageMetadata: object}>}
 */
export async function transcribeAudio(audioPath, apiKey, onProgress) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite-001' });

    console.log('📂 Iniciando transcrição de:', audioPath);
    onProgress?.({ percentage: 5, stage: 'Lendo e dividindo arquivo de áudio...' });

    const { segments, mimeType, totalSize } = await splitAudioIntoSegments(audioPath);
    const totalSegments = segments.length;

    console.log(`📊 Arquivo de ${(totalSize / (1024 * 1024)).toFixed(2)} MB dividido em ${totalSegments} segmento(s)`);
    console.log(`⏱️ Configuração: Cooldown de ${COOLDOWN_DURATION_MS / 1000}s a cada ${COOLDOWN_AFTER_SEGMENTS} segmentos`);
    onProgress?.({ percentage: 10, stage: `Arquivo dividido em ${totalSegments} segmento(s). Iniciando transcrição...` });

    const transcriptions = [];
    let totalUsage = { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };

    for (let i = 0; i < totalSegments; i++) {
        const segmentNum = i + 1;
        const segmentSize = (segments[i].length / (1024 * 1024)).toFixed(2);
        const progressPercentage = 10 + Math.floor((i / totalSegments) * 80);

        // Cooldown after every COOLDOWN_AFTER_SEGMENTS (except first batch)
        if (i > 0 && i % COOLDOWN_AFTER_SEGMENTS === 0) {
            const cooldownSecs = COOLDOWN_DURATION_MS / 1000;
            console.log(`⏸️ Cooldown de ${cooldownSecs}s para evitar rate limiting...`);
            onProgress?.({
                percentage: progressPercentage,
                stage: `Aguardando ${cooldownSecs}s antes de continuar (evitando limite de requisições)...`
            });
            await sleep(COOLDOWN_DURATION_MS);
            console.log(`▶️ Cooldown concluído, retomando...`);
        }

        console.log(`🎙️ [Segmento ${segmentNum}/${totalSegments}] Processando ${segmentSize} MB...`);
        onProgress?.({
            percentage: progressPercentage,
            stage: `Transcrevendo parte ${segmentNum} de ${totalSegments}...`
        });

        const audioParts = segmentToGenerativeParts(segments[i], mimeType);
        console.log(`   📦 Segmento ${segmentNum}: ${audioParts.length} parte(s) criada(s)`);

        // Prompt that instructs continuation from previous segment
        const continuationPrompt = i === 0
            ? MEDIA_DIARIZATION_PROMPT
            : `Continue transcrevendo este segmento de áudio, mantendo a consistência com os oradores já identificados anteriormente. ${MEDIA_DIARIZATION_PROMPT}`;

        const contents = [...audioParts, { text: continuationPrompt }];

        // Retry loop for rate limiting
        let lastError = null;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`   ⏳ Segmento ${segmentNum}: Enviando para Gemini API... (tentativa ${attempt}/${MAX_RETRIES})`);
                const startTime = Date.now();

                const result = await model.generateContent(contents);
                const response = await result.response;
                const text = response.text();

                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`   ✅ Segmento ${segmentNum}: Concluído em ${elapsed}s (${text.length} caracteres)`);

                transcriptions.push(text);

                // Accumulate and log detailed usage metadata
                if (response.usageMetadata) {
                    const usage = response.usageMetadata;
                    totalUsage.promptTokenCount += usage.promptTokenCount || 0;
                    totalUsage.candidatesTokenCount += usage.candidatesTokenCount || 0;
                    totalUsage.totalTokenCount += usage.totalTokenCount || 0;

                    // Detailed token breakdown
                    console.log(`   📈 Segmento ${segmentNum} - Tokens:`);
                    console.log(`      🔹 Entrada (prompt): ${usage.promptTokenCount || 0}`);
                    console.log(`      🔹 Saída (resposta): ${usage.candidatesTokenCount || 0}`);
                    console.log(`      🔹 Total: ${usage.totalTokenCount || 0}`);

                    // Audio vs Text breakdown if available
                    if (usage.promptTokensDetails) {
                        const audioTokens = usage.promptTokensDetails.audioTokens || 0;
                        const textTokens = usage.promptTokensDetails.textTokens || 0;
                        console.log(`      🎵 Áudio: ${audioTokens} | 📝 Texto: ${textTokens}`);
                    }
                }

                lastError = null;
                break; // Success, exit retry loop

            } catch (error) {
                lastError = error;
                const isRateLimited = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate');

                if (isRateLimited && attempt < MAX_RETRIES) {
                    const retryDelay = RETRY_BASE_DELAY_MS * attempt; // Exponential backoff
                    console.log(`   ⚠️ Segmento ${segmentNum}: Rate limited! Aguardando ${retryDelay / 1000}s antes de tentar novamente...`);
                    onProgress?.({
                        percentage: progressPercentage,
                        stage: `Rate limited - aguardando ${retryDelay / 1000}s (tentativa ${attempt}/${MAX_RETRIES})...`
                    });
                    await sleep(retryDelay);
                } else {
                    console.error(`   ❌ Segmento ${segmentNum}: Erro - ${error.message}`);
                    break; // Non-retryable error or max retries reached
                }
            }
        }

        if (lastError) {
            throw handleGeminiError(lastError, 'transcription');
        }
    }

    // Combine all transcriptions
    const fullTranscription = transcriptions.join('\n\n---\n\n');

    console.log(`🎉 Transcrição completa! ${totalSegments} segmento(s), ${fullTranscription.length} caracteres no total`);
    console.log(`📊 Uso total de tokens: ${totalUsage.totalTokenCount}`);
    onProgress?.({ percentage: 100, stage: 'Transcrição concluída!' });

    return {
        text: fullTranscription,
        usageMetadata: totalUsage,
    };
}

/**
 * Generate meeting minutes from transcription
 * @param {string} transcription - Diarized transcription text
 * @param {string} condoName - Condo name
 * @param {string} template - Template type: 'formal', 'summary', or 'agenda'
 * @param {string} apiKey - Decrypted Gemini API key
 * @returns {Promise<{text: string, usageMetadata: object}>}
 */
export async function generateMinutes(transcription, condoName, template, apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const finalCondoName = condoName?.trim() || 'Edifício Barão do Rio Branco';
    const basePrompt = PROMPTS[template] || PROMPTS['formal'];
    const prompt = basePrompt
        .replace('{diarizedTranscript}', transcription)
        .replace(/{condoName}/g, finalCondoName);

    // Log transcription size for debugging
    const transcriptionTokenEstimate = Math.ceil(transcription.length / 4); // ~4 chars per token
    console.log(`📝 Gerando ata para transcrição de ~${transcriptionTokenEstimate} tokens estimados`);

    // Retry logic with exponential backoff for rate limiting
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 60 * 1000; // 60 seconds base delay

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`   ⏳ Tentativa ${attempt}/${MAX_RETRIES} - Enviando para Gemini...`);
            const startTime = Date.now();

            const result = await model.generateContent(prompt);
            const response = await result.response;

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`   ✅ Ata gerada em ${elapsed}s`);

            if (response.usageMetadata) {
                console.log(`   📈 Tokens usados: entrada=${response.usageMetadata.promptTokenCount}, saída=${response.usageMetadata.candidatesTokenCount}`);
            }

            return {
                text: response.text(),
                usageMetadata: response.usageMetadata,
            };
        } catch (error) {
            const isRateLimited = error.message?.includes('429') ||
                error.message?.includes('quota') ||
                error.message?.includes('rate') ||
                error.message?.includes('exhausted');

            if (isRateLimited && attempt < MAX_RETRIES) {
                const delayMs = BASE_DELAY_MS * attempt;
                console.log(`   ⚠️ Rate limited! Aguardando ${delayMs / 1000}s antes de tentar novamente...`);
                await sleep(delayMs);
            } else {
                console.error('Gemini minutes generation error:', error);
                throw handleGeminiError(error, 'minutes');
            }
        }
    }

    throw new Error('Falha após múltiplas tentativas. Tente novamente mais tarde.');
}

/**
 * Handle Gemini API errors with user-friendly messages
 */
function handleGeminiError(error, context) {
    if (error.message) {
        if (error.message.includes('API key not valid')) {
            return new Error('A chave de API é inválida. Verifique suas credenciais.');
        }
        if (error.message.includes('429')) {
            return new Error('A cota de uso da API foi excedida. Tente novamente mais tarde.');
        }
        if (error.message.toLowerCase().includes('token limit') || error.message.includes('size limit')) {
            return new Error('O arquivo de mídia é muito longo para ser processado. Tente um arquivo menor.');
        }
    }

    const operation = context === 'transcription' ? 'transcrição' : 'geração da ata';
    return new Error(`Ocorreu um erro na ${operation}. Por favor, tente novamente.`);
}
