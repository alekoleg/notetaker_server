const OpenAI = require('openai');
const AIAssistantToolingProvider = require('./aiAssistantToolingProvider');


const MODEL = process.env.OPENAI_MODEL || 'gpt-5.1';

if (!process.env.OPENAI_API_KEY) {
	throw new Error('OPENAI_API_KEY is not set');
}

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

/**
 * Создает ответ с использованием Responses API с поддержкой tools
 * @param {string} userMessage - Сообщение пользователя
 * @param {string} systemPrompt - Системный промпт (инструкции)
 * @param {Array} conversationHistory - История сообщений
 * @param {boolean} useTools - Использовать ли инструменты
 * @returns {Promise<string>} - Ответ от AI
 */
async function createChatResponse(userMessage, systemPrompt, conversationHistory = [], useTools = true) {
	// Создаем input_list как массив объектов (как в документации OpenAI)
	let inputList = [];

	// Добавляем историю в формате массива объектов
	if (conversationHistory && conversationHistory.length > 0) {
		conversationHistory.forEach(msg => {
			inputList.push({
				role: msg.participant === 'user' ? 'user' : 'assistant',
				content: msg.message
			});
		});
	}

	// Добавляем текущее сообщение пользователя
	inputList.push({
		role: 'user',
		content: userMessage
	});

	const options = {
		model: MODEL,
		instructions: systemPrompt,
		input: inputList,
		reasoning: { effort: 'low' }
	};

	// Добавляем tools если включены
	if (useTools) {
		options.tools = AIAssistantToolingProvider.getTools();
	}

	console.log('[OpenAIService] Creating response with tools:', useTools);

	let response = await openai.responses.create(options);
	console.log('[OpenAIService] Response output length:', response.output?.length);

	// Обрабатываем tool calls через response.output
	const maxIterations = 5;
	let iterations = 0;

	// Проверяем наличие function_call в output
	let hasFunctionCalls = response.output?.some(item => item.type === 'function_call');

	while (hasFunctionCalls && iterations < maxIterations) {
		iterations++;
		console.log(`[OpenAIService] Processing function calls (iteration ${iterations})`);

		// Добавляем весь output к input_list (как в документации OpenAI)
		inputList = inputList.concat(response.output);

		// Обрабатываем каждый элемент в output и выполняем function calls
		for (const item of response.output) {
			if (item.type === 'function_call') {
				const functionName = item.name;
				const functionArgs = JSON.parse(item.arguments);

				console.log(`[OpenAIService] Executing tool: ${functionName}`, functionArgs);

				try {
					const functionResponse = await AIAssistantToolingProvider.executeTool(functionName, functionArgs);

					// Добавляем результат в формате function_call_output
					inputList.push({
						type: 'function_call_output',
						call_id: item.call_id,
						output: JSON.stringify(functionResponse)
					});
				} catch (error) {
					console.error(`[OpenAIService] Error executing tool ${functionName}:`, error);
					inputList.push({
						type: 'function_call_output',
						call_id: item.call_id,
						output: JSON.stringify({ error: error.message })
					});
				}
			}
		}

		// Отправляем обновленный запрос с накопленными результатами
		response = await openai.responses.create({
			model: MODEL,
			instructions: systemPrompt,
			input: inputList,
			reasoning: { effort: 'medium' },
			tools: useTools ? AIAssistantToolingProvider.getTools() : undefined
		});

		// Проверяем есть ли еще function_call в новом ответе
		hasFunctionCalls = response.output?.some(item => item.type === 'function_call');
	}

	if (iterations >= maxIterations) {
		console.warn('[OpenAIService] Reached max iterations for tool calls');
	}

	return response.output_text || 'Извините, не удалось сгенерировать ответ.';
}


module.exports = {
	createChatResponse
};

