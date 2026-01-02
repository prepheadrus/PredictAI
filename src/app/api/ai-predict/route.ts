'use server';
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { ai } from '@/ai/genkit';

interface PythonOutput {
    math_model: string;
    home_win: number;
    draw: number;
    away_win: number;
    score_prediction: string;
    confidence: number;
    error?: string;
}

// Python scriptini çalıştıran fonksiyon
function runPythonAnalysis(home: string, away: string, league: string): Promise<PythonOutput> {
  return new Promise((resolve, reject) => {
    const pythonExecutable = process.env.PYTHON_PATH || 'python';
    const scriptPath = path.join(process.cwd(), 'analysis.py');

    const pythonProcess = spawn(pythonExecutable, [scriptPath, home, away, league]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script stderr: ${stderr}`);
        return reject(new Error(`Python script exited with code ${code}: ${stderr}`));
      }
      try {
        const result: PythonOutput = JSON.parse(stdout);
        if (result.error) {
            return reject(new Error(result.error));
        }
        resolve(result);
      } catch (e) {
        console.error('Failed to parse Python script output:', stdout);
        reject(new Error('Failed to parse JSON from Python script.'));
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      if ((err as any).code === 'ENOENT') {
        return reject(new Error(`Python executable not found at '${pythonExecutable}'. Please ensure Python is installed and the path is correct.`));
      }
      reject(err);
    });
  });
}

// API Route Handler
export async function POST(req: NextRequest) {
  try {
    const { homeTeam, awayTeam, league } = await req.json();

    if (!homeTeam || !awayTeam || !league) {
      return NextResponse.json({ error: 'Missing team or league information' }, { status: 400 });
    }

    // 1. Python'dan matematiksel analizi al
    const mathResult = await runPythonAnalysis(homeTeam, awayTeam, league);

    // 2. Gemini için prompt oluştur
    const promptText = `
      Bir uzman futbol analisti olarak aşağıdaki matematiksel verileri yorumla. 
      Yorumun kısa, net ve bahis odaklı olsun. Sadece maçı yorumla, olasılıkları tekrar etme.

      Matematiksel Analiz:
      - Model: ${mathResult.math_model}
      - ${homeTeam} Kazanma Olasılığı: %${mathResult.home_win}
      - Beraberlik Olasılığı: %${mathResult.draw}
      - ${awayTeam} Kazanma Olasılığı: %${mathResult.away_win}
      - Tahmini Skor: ${mathResult.score_prediction}

      Lütfen bu verilere dayanarak kısa bir maç yorumu yap.
    `;

    // 3. Gemini'den yorumsal analizi al
    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: promptText,
    });
    
    const aiInterpretation = text;

    // 4. İki sonucu birleştirip frontend'e gönder
    return NextResponse.json({
      mathAnalysis: mathResult,
      aiInterpretation: aiInterpretation,
    });

  } catch (error: any) {
    console.error('[AI-PREDICT API ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
