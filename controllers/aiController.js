import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES Modules mein __dirname maujood nahi hota, is liye ye setup zaroori hai
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const analyzeImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image uploaded" });
        }

        const imagePath = req.file.path;
        
        // Paths ko absolute banane ke liye path.resolve use karein
        // Ensure karein ke 'models' aur 'scripts' folders aapke controller se ek level upar hain
        const modelPath = path.resolve(__dirname, '../models/best.pt'); 
        const scriptPath = path.resolve(__dirname, '../scripts/ai_engine.py');

        // Python Spawn
        const pythonProcess = spawn('python', [scriptPath, imagePath, modelPath]);

        let dataString = "";
        let errorString = "";

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
            console.error(`Python Error Stream: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            // Processing ke baad image delete kar dein
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

            if (code !== 0) {
                console.error(`Python process exited with code ${code}. Error: ${errorString}`);
                return res.status(500).json({ success: false, message: "AI processing failed" });
            }

            try {
                // Check karein ke dataString khali to nahi
                if (!dataString.trim()) {
                    throw new Error("Python script returned empty output");
                }
                const result = JSON.parse(dataString);
                res.status(200).json({ success: true, data: result });
            } catch (err) {
                console.error("JSON Parse Error:", err.message, "Raw Data:", dataString);
                res.status(500).json({ success: false, message: "Invalid response from AI engine" });
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};