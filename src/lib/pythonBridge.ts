import { spawn } from 'child_process';
import path from 'path';

export interface PredictionResult {
  prediction: 'HOME_WIN' | 'AWAY_WIN' | 'DRAW';
  confidence: number;
  analysis: string;
  error?: string;
}

export function getPrediction(homeTeamId: number, awayTeamId: number): Promise<PredictionResult> {
  return new Promise((resolve, reject) => {
    // Resolve the path to the python executable and script
    const pythonExecutable = process.env.PYTHON_PATH || 'python'; // Or 'python3'
    const scriptPath = path.join(process.cwd(), 'ml_engine', 'predict.py');

    const pythonProcess = spawn(pythonExecutable, [
      scriptPath,
      homeTeamId.toString(),
      awayTeamId.toString(),
    ]);

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
        console.error(`Python script exited with code ${code}`);
        console.error(`Stderr: ${stderr}`);
        return reject(new Error(`Python script error: ${stderr}`));
      }

      try {
        const result: PredictionResult = JSON.parse(stdout);
        if (result.error) {
            return reject(new Error(result.error));
        }
        resolve(result);
      } catch (e) {
        console.error('Failed to parse Python script output:', stdout);
        reject(new Error('Failed to parse prediction JSON from Python script.'));
      }
    });

    pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process:', err);
        if ((err as any).code === 'ENOENT') {
            return reject(new Error(`Python executable not found. Please ensure Python is installed and accessible via the system's PATH or set the PYTHON_PATH environment variable.`));
        }
        reject(err);
    });
  });
}
