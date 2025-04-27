require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 1000;

app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static('views'));

const users = {
  1: { id: 1, username: 'carlos', password: 'secret' },
  2: { id: 2, username: 'wiener', password: 'peter' }
};

// صفحة الدخول
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// تسجيل الدخول
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = Object.values(users).find(u => u.username === username && u.password === password);
  if (user) {
    req.session.userId = user.id;
    res.redirect('/chat');
  } else {
    res.send(' Wrong login');
  }
});

// صفحة المحادثة
app.get('/chat', (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const filePath = path.join(__dirname, 'messages', `${req.session.userId}.txt`);
    let content = '';
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf-8');
      // إزالة كلمات المرور من العرض في الصفحة
      content = content.replace(/Password: .*\n/g, '');
    }
  
    const html = fs.readFileSync(path.join(__dirname, 'views', 'chat.html'), 'utf-8');
    const finalHtml = html
      .replace('{{userId}}', req.session.userId)
      .replace('{{messages}}', content)
      .replace('{{file}}', `${req.session.userId}.txt`);
  
    res.send(finalHtml);
  });
  

// إرسال رسالة
app.post('/chat/send', (req, res) => {
  const userId = req.session.userId;
  const message = req.body.message;
  const filePath = path.join(__dirname, 'messages', `${userId}.txt`);
  const user = users[userId];
  const newEntry = `Message: ${message}\nPassword: ${user.password}\n\n`;
  fs.appendFileSync(filePath, newEntry);
  res.redirect('/chat');
});

// ⚠️ ثغرة IDOR: يمكن تغيير اسم الملف
app.get('/chat/download', (req, res) => {
  const file = req.query.file;
  const filePath = path.join(__dirname, 'messages', file);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.send('File not found');
  }
});
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Logout failed');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});
app.listen(PORT, () => console.log(`💬 Chat app running at http://localhost:${PORT}`));
