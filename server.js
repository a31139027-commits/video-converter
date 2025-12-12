const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();

// 上傳暫存資料夾
const upload = multer({ dest: 'uploads/' });

// 靜態檔案（前端）
app.use(express.static('public'));

// ✅ 加這行：讓 req.body.format 讀得到
app.use(express.urlencoded({ extended: true }));

// 確保資料夾存在
['uploads', 'converted'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

// 上傳 + 轉檔 API
app.post('/convert', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const inputPath = req.file.path;
  const format = req.body.format || 'mp4';
  const outputName = `${Date.now()}.${format}`;
  const outputPath = path.join('converted', outputName);

  ffmpeg(inputPath)
    .output(outputPath)
    .on('end', () => {
      // 刪除原始檔
      fs.unlink(inputPath, () => {});

      // 回傳下載連結
      res.json({ url: `/download/${outputName}` });

      // 過 10 分鐘自動刪除轉檔檔案，避免堆積
      setTimeout(() => {
        fs.unlink(outputPath, () => {});
      }, 10 * 60 * 1000);
    })
    .on('error', (err) => {
      console.error(err);
      fs.unlink(inputPath, () => {});
      res.status(500).send('Conversion failed.');
    })
    .run();
});

// 提供下載
app.get('/download/:file', (req, res) => {
  const filePath = path.join(__dirname, 'converted', req.params.file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found or already deleted.');
  }
  res.download(filePath);
});

// ✅ 加這段：Render 健康檢查用
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
