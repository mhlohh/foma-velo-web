import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Shared Gemini client helper
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing. Please ensure your API key is configured in settings.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API endpoint for Training Data Analysis
  app.post('/api/ai/analyze-training', async (req, res) => {
    try {
      const { prompt, trainingContext, focusArea } = req.body;
      const ai = getAiClient();

      const systemInstruction = `You are a world-class professional cycling coach, exercise physiologist, and sports scientist specializing in the Coggan Performance Management Chart (PMC) methodology (CTL/Fitness, ATL/Fatigue, TSB/Form, Ramp Rate, and TSS).
You provide sharp, encouraging, highly actionable, and scientifically sound training analysis tailored to the athlete's actual metrics and recent workouts.

Structure your response clearly with Markdown:
1. 🎯 **Current State & Training Status (CTL / ATL / TSB Analysis)**: Explain what their current numbers mean for their physiological condition right now.
2. 📈 **Ramp Rate & Workload Progression**: Evaluate whether their fitness ramp is sustainable (< 5-8 TSS/wk), conservative, or at risk of overtraining / excessive fatigue.
3. 🚴 **Weekly Workload & Workout Structure Insights**: Analyze their volume, intensity distribution, and key rides.
4. 💡 **Targeted Coaching Recommendations (Next 7-14 Days)**: Specific, actionable guidance for upcoming workouts, recovery needs, intensity placement, or taper strategies.
5. ⚠️ **Fatigue & Injury Risk Assessment**: Clear flags or green lights regarding freshness and recovery.

Keep the tone professional, motivating, clear, and direct. Use bullet points and bold highlights for scannability. Avoid vague generic platitudes; refer directly to the metrics and activities provided.`;

      const userContent = `Here is the athlete's current training summary and recent workout data:
${JSON.stringify(trainingContext, null, 2)}

${focusArea ? `Specific focus area requested: ${focusArea}` : ''}
${prompt ? `Athlete's specific question/note: ${prompt}` : 'Please provide a comprehensive physiological and performance analysis of my current training data, fitness progression, and recommendations for the coming weeks.'}`;

      // Fallback model list with high-availability priority
      const candidateModels = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.7-flash'];
      let lastError: any = null;
      let generatedText: string | undefined;

      for (let attempt = 0; attempt < candidateModels.length; attempt++) {
        const model = candidateModels[attempt];
        try {
          const response = await ai.models.generateContent({
            model,
            contents: userContent,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });

          if (response.text) {
            generatedText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          // Wait with progressive backoff before attempting next candidate
          await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 800));
        }
      }

      if (!generatedText) {
        throw lastError || new Error('All AI models are temporarily busy. Please retry in a few moments.');
      }

      res.json({
        analysis: generatedText,
      });
    } catch (error: any) {
      console.error('Error generating AI analysis:', error);
      let userFriendlyMsg = error?.message || 'Failed to generate training analysis.';
      if (typeof userFriendlyMsg === 'string' && userFriendlyMsg.includes('503')) {
        userFriendlyMsg = 'The AI service is experiencing temporary high demand. Please click Retry in a moment.';
      }
      res.status(500).json({
        error: userFriendlyMsg,
      });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
