const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

const allowedOrigins = [
    "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"
];

app.use(cors({ origin: allowedOrigins, methods: ["GET", "POST"], credentials: true }));
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true }
});

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static('uploads'));

const db = mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'sl_service_db'
});

io.on("connection", (socket) => {
    socket.on("join_room", (userId) => {
        const roomID = String(userId);
        socket.join(roomID);
    });

    socket.on("send_message", (data) => {
        const { senderId, receiverId, message } = data;
        const sql = "INSERT INTO chats (sender_id, receiver_id, message) VALUES (?, ?, ?)";
        db.query(sql, [senderId, receiverId, message], (err, result) => {
            if (!err) {
                io.to(String(receiverId)).emit("receive_message", data);
                io.to(String(senderId)).emit("receive_message", data);
            }
        });
    });

    // --- CALLING EVENTS (අලුත් කොටස) ---
    socket.on("callUser", (data) => {
        // data = { userToCall, signalData, from, name }
        io.to(String(data.userToCall)).emit("callUser", { 
            signal: data.signalData, 
            from: data.from, 
            name: data.name 
        });
    });

    socket.on("answerCall", (data) => {
        io.to(String(data.to)).emit("callAccepted", data.signal);
    });
    
    socket.on("endCall", (data) => {
        io.to(String(data.to)).emit("callEnded");
    });
});

// --- API ROUTES ---
app.post('/update-booking-status', (req, res) => {
    const { bookingId, status, clientId, workerId } = req.body;
    const sql = "UPDATE bookings SET status = ? WHERE id = ?";
    db.query(sql, [status, bookingId], (err, result) => {
        if(err) return res.json({Error: err});
        io.to(String(clientId)).emit("booking_status_updated", { bookingId, status });
        io.to(String(workerId)).emit("booking_status_updated", { bookingId, status });
        return res.json({Status: "Success"});
    });
});

app.get('/client-bookings/:clientId', (req, res) => {
    const sql = "SELECT b.*, u.name as worker_name, u.phone as worker_phone FROM bookings b JOIN users u ON b.worker_id = u.id WHERE b.client_id = ? ORDER BY b.created_at DESC";
    db.query(sql, [req.params.clientId], (err, result) => res.json(result));
});

// Other routes (Register, Login, etc. - Keep same as before)
app.post('/register', upload.fields([{ name: 'nicFrontImage' }, { name: 'nicBackImage' }, { name: 'selfieImage' }]), async (req, res) => {
    const { name, phone, password, role, jobType, bankAcc, bankName, branch, city } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const nicFrontPath = req.files['nicFrontImage'] ? req.files['nicFrontImage'][0].path : null;
        const nicBackPath = req.files['nicBackImage'] ? req.files['nicBackImage'][0].path : null;
        const selfiePath = req.files['selfieImage'] ? req.files['selfieImage'][0].path : null;
        const sqlUser = "INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)";
        db.query(sqlUser, [name, phone, hashedPassword, role], (err, result) => {
            if (err) return res.status(500).json({ error: "Error" });
            const userId = result.insertId;
            if (role === 'worker') {
                const sqlWorker = "INSERT INTO worker_details (user_id, job_type, bank_account_number, bank_name, branch_name, city, nic_front_path, nic_back_path, selfie_photo_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                db.query(sqlWorker, [userId, jobType, bankAcc, bankName, branch, city, nicFrontPath, nicBackPath, selfiePath], (err, result) => res.json({ message: "Success" }));
            } else return res.json({ message: "Success" });
        });
    } catch (e) { return res.status(500).json({ error: "Error" }); }
});

app.post('/login', (req, res) => {
    const { phone, password } = req.body;
    const sql = "SELECT * FROM users WHERE phone = ?";
    db.query(sql, [phone], async (err, data) => {
        if(err) return res.json("Error");
        if(data.length > 0) {
            const match = await bcrypt.compare(password, data[0].password);
            if(match) return res.json({status: "Success", role: data[0].role, userId: data[0].id});
            else return res.json("Wrong Password");
        } else return res.json("No User Found");
    });
});

app.get('/worker-profile/:id', (req, res) => {
    const sql = "SELECT u.name, u.phone, w.job_type, w.city, w.nic_front_path, w.nic_back_path, w.selfie_photo_path FROM users u JOIN worker_details w ON u.id = w.user_id WHERE u.id = ?";
    db.query(sql, [req.params.id], (err, result) => res.json(result[0]));
});

app.get('/get-workers/:type', (req, res) => {
    const sql = "SELECT u.id, u.name, u.phone, w.job_type, w.city, w.selfie_photo_path FROM users u JOIN worker_details w ON u.id = w.user_id WHERE w.job_type = ?";
    db.query(sql, [req.params.type], (err, result) => res.json(result));
});

app.post('/book-worker', (req, res) => {
    const { clientId, workerId, lat, lng } = req.body;
    const sql = "INSERT INTO bookings (client_id, worker_id, client_lat, client_lng) VALUES (?, ?, ?, ?)";
    db.query(sql, [clientId, workerId, lat, lng], (err, result) => res.json({Status: "Success"}));
});

app.get('/my-bookings/:workerId', (req, res) => {
    const sql = "SELECT b.*, u.name as client_name, u.phone as client_phone FROM bookings b JOIN users u ON b.client_id = u.id WHERE b.worker_id = ?";
    db.query(sql, [req.params.workerId], (err, result) => res.json(result));
});

app.get('/get-messages/:user1/:user2', (req, res) => {
    const { user1, user2 } = req.params;
    const sql = "SELECT * FROM chats WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY id ASC";
    db.query(sql, [user1, user2, user2, user1], (err, result) => res.json(result));
});

server.listen(8081, () => {
    console.log("Server running on port 8081");
});