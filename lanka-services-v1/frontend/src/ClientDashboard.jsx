import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const socket = io.connect("http://localhost:8081");

function ClientDashboard() {
  const [workers, setWorkers] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState("");

  // Call States
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [nameToCall, setNameToCall] = useState("");
  const [isCalling, setIsCalling] = useState(false);

  const myAudio = useRef();
  const userAudio = useRef();
  const connectionRef = useRef();
  const ringtoneRef = useRef(new Audio('/ringtone.mp3'));

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const clientId = localStorage.getItem('userId');
  const jobCategories = ['Electrician', 'Plumber', 'Mason', 'Helper', 'Carpenter', 'Painter', 'CCTV Tech', 'AC Repair'];

  useEffect(() => {
    ringtoneRef.current.loop = true;

    if(clientId) {
        socket.emit("join_room", clientId);
        fetchMyBookings();
        navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then((currentStream) => {
            setStream(currentStream);
            if (myAudio.current) myAudio.current.srcObject = currentStream;
        });
    }
  }, [clientId]);

  const fetchMyBookings = async () => {
    try {
        const res = await axios.get(`http://localhost:8081/client-bookings/${clientId}`);
        setMyBookings(res.data);
    } catch(err) { console.log(err); }
  };

  useEffect(() => {
    // 1. Call Events
    socket.on("callUser", (data) => {
        setReceivingCall(true);
        setCaller(data.from);
        setNameToCall(data.name);
        setCallerSignal(data.signal);
        setCallEnded(false);
        ringtoneRef.current.play().catch(e => console.log(e));
    });

    socket.on("callAccepted", (signal) => {
        setCallAccepted(true);
        setIsCalling(false);
        stopRingtone();
        connectionRef.current.signal(signal);
    });

    socket.on("callEnded", () => {
        stopRingtone();
        setCallEnded(true);
        setReceivingCall(false);
        setCallAccepted(false);
        setIsCalling(false);
        if(connectionRef.current) connectionRef.current.destroy();
        window.location.reload();
    });

    // 2. Chat Events
    socket.on("booking_status_updated", (data) => {
        setMyBookings(prev => prev.map(b => b.id === data.bookingId ? { ...b, status: data.status } : b));
        if(data.status === 'Accepted') toast.success("Worker Accepted!");
        if(data.status === 'Declined') toast.error("Worker Declined.");
    });
    
    socket.on("receive_message", (data) => {
      if (String(data.senderId) === String(clientId)) return;
      const isChatOpen = selectedWorker && (String(selectedWorker.id) === String(data.senderId));
      if (isChatOpen) setChatHistory((prev) => [...prev, data]);
      try { new Audio('/notification.mp3').play(); } catch(e) {}
      toast.info(`Msg: ${data.message}`, { autoClose: 3000 });
    });

    return () => {
        socket.off("callUser");
        socket.off("callAccepted");
        socket.off("callEnded");
        socket.off("receive_message");
        socket.off("booking_status_updated");
    };
  }, [selectedWorker, clientId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  const stopRingtone = () => {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
  };

  const callUser = (id) => {
    setIsCalling(true);
    ringtoneRef.current.play().catch(e => console.log(e));

    const peer = new SimplePeer({ 
        initiator: true, 
        trickle: false, 
        stream: stream,
        config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] } 
    });
    peer.on("signal", (data) => {
        socket.emit("callUser", { userToCall: id, signalData: data, from: clientId, name: "Client" });
    });
    peer.on("stream", (currentStream) => {
        if (userAudio.current) userAudio.current.srcObject = currentStream;
    });
    socket.on("callAccepted", (signal) => {
        setCallAccepted(true);
        stopRingtone();
        peer.signal(signal);
    });
    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    stopRingtone();
    const peer = new SimplePeer({ 
        initiator: false, 
        trickle: false, 
        stream: stream,
        config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] } 
    });
    peer.on("signal", (data) => {
        socket.emit("answerCall", { signal: data, to: caller });
    });
    peer.on("stream", (currentStream) => {
        if (userAudio.current) userAudio.current.srcObject = currentStream;
    });
    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    stopRingtone();
    setCallEnded(true);
    setIsCalling(false);
    setReceivingCall(false);
    
    const targetId = caller ? caller : (selectedWorker ? selectedWorker.id : null);
    if(targetId) {
        socket.emit("endCall", { to: targetId });
    }
    
    if(connectionRef.current) connectionRef.current.destroy();
    window.location.reload();
  };

  const fetchWorkers = async (job) => {
    const res = await axios.get(`http://localhost:8081/get-workers/${job}`);
    setWorkers(res.data);
    if(res.data.length === 0) toast.info("No workers found.");
  };

  const openChat = async (workerOrData) => {
    const workerId = workerOrData.id;
    const workerName = workerOrData.name;
    setSelectedWorker({ id: workerId, name: workerName });
    const res = await axios.get(`http://localhost:8081/get-messages/${clientId}/${workerId}`);
    setChatHistory(res.data);
  };

  const sendMessage = async () => {
    if(!message) return;
    const msgData = { senderId: clientId, receiverId: selectedWorker.id, message, timestamp: new Date().toISOString() };
    await socket.emit("send_message", msgData);
    setChatHistory((prev) => [...prev, msgData]);
    setMessage("");
  };

  const handleBook = (workerId) => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            await axios.post('http://localhost:8081/book-worker', { clientId, workerId, lat: pos.coords.latitude, lng: pos.coords.longitude });
            toast.success("Booking Sent!");
            fetchMyBookings();
        });
    } else toast.error("GPS Error");
  };

  const handleLogout = () => { localStorage.removeItem('userId'); navigate('/'); };

  const activeBookings = myBookings.filter(b => b.status === 'Pending' || b.status === 'Accepted');
  const historyBookings = myBookings.filter(b => b.status === 'Declined' || b.status === 'Completed');

  return (
    <div className="min-h-screen bg-gray-100 pb-10 font-sans">
      <nav className="w-full bg-blue-700 p-4 text-white flex justify-between items-center fixed top-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarOpen(true)} className="text-2xl focus:outline-none">☰</button>
             <h1 className="font-bold text-lg">Client Panel</h1>
        </div>
        <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded text-sm hover:bg-red-600">Logout</button>
      </nav>

      {/* Sidebar & Modals */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black bg-opacity-50 z-[60]"></div>}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-[70] transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 bg-blue-800 text-white flex justify-between items-center"><h2 className="font-bold text-lg">Menu</h2><button onClick={() => setIsSidebarOpen(false)} className="text-xl">✕</button></div>
        <div className="p-4 space-y-2">
            <button onClick={() => { setActiveModal('history'); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-100 rounded flex items-center gap-3 text-gray-700 font-medium">📜 Booking History</button>
            <button onClick={() => { setActiveModal('bank'); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-100 rounded flex items-center gap-3 text-gray-700 font-medium">🏦 Bank Details</button>
            <button onClick={() => { setActiveModal('cards'); setIsSidebarOpen(false); }} className="w-full text-left p-3 hover:bg-gray-100 rounded flex items-center gap-3 text-gray-700 font-medium">💳 Card Payments</button>
        </div>
      </div>
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[80] flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
                <button onClick={() => setActiveModal(null)} className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-xl font-bold">✕</button>
                {activeModal === 'history' && (
                    <div className="max-h-80 overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 border-b pb-2">History</h2>
                         {historyBookings.map(b => (
                            <div key={b.id} className="bg-gray-50 p-3 rounded mb-2 border opacity-75"><div className="flex justify-between"><span className="font-bold">Worker {b.worker_id}</span><span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">{b.status}</span></div><p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleString()}</p></div>
                        ))}
                    </div>
                )}
                {activeModal === 'bank' && <div className="text-center">Bank Details UI</div>}
                {activeModal === 'cards' && <div className="text-center">Card Details UI</div>}
            </div>
        </div>
      )}

      {/* Calls UI */}
      {isCalling && !callAccepted && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex flex-col items-center justify-center">
              <div className="bg-gray-800 p-8 rounded-full animate-pulse mb-8"><span className="text-6xl">📞</span></div>
              <h2 className="text-white text-2xl font-bold mb-4">Calling {selectedWorker?.name}...</h2>
              <p className="text-gray-400 mb-6">Ringing...</p>
              <button onClick={leaveCall} className="bg-red-600 text-white px-6 py-3 rounded-full font-bold text-xl shadow-lg hover:bg-red-700">🛑 End Call</button>
          </div>
      )}
      {receivingCall && !callAccepted && (
          <div className="fixed top-20 right-5 bg-white p-5 rounded-lg shadow-2xl z-[100] border-l-4 border-green-500 animate-bounce">
              <h1 className="font-bold text-lg text-gray-800">Incoming Voice Call...</h1>
              <p className="text-sm text-gray-500 mb-3">from {nameToCall}</p>
              <div className="flex gap-2 mt-3">
                  <button onClick={answerCall} className="bg-green-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-green-700">Answer</button>
                  <button onClick={leaveCall} className="bg-red-500 text-white px-4 py-2 rounded font-bold shadow hover:bg-red-600">Decline</button>
              </div>
          </div>
      )}
      {callAccepted && !callEnded && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex flex-col items-center justify-center">
              <div className="bg-green-600 p-6 rounded-full animate-pulse mb-8"><span className="text-6xl">🔊</span></div>
              <h2 className="text-white text-2xl font-bold mb-4">Call in Progress...</h2>
              <div className="text-gray-300 mb-8">Talking with {selectedWorker?.name || nameToCall}</div>
              <audio ref={myAudio} autoPlay muted />
              <audio ref={userAudio} autoPlay />
              <button onClick={leaveCall} className="bg-red-600 text-white px-6 py-3 rounded-full font-bold text-xl shadow-lg hover:bg-red-700">🛑 End Call</button>
          </div>
      )}

      {/* Main Content */}
      <div className="mt-24 p-4 max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
        <div className="md:w-2/3">
            <h2 className="text-xl font-bold mb-4">Find Workers</h2>
            <div className="grid grid-cols-4 gap-2 mb-6">
                {jobCategories.map(job => (
                    <button key={job} onClick={() => fetchWorkers(job)} className="bg-white p-3 shadow rounded hover:bg-blue-50 text-sm font-bold">{job}</button>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workers.map(w => (
                    <div key={w.id} className="bg-white p-4 rounded shadow flex flex-col items-center">
                        <img src={`http://localhost:8081/${w.selfie_photo_path}`} className="w-16 h-16 rounded-full object-cover mb-2"/>
                        <h3 className="font-bold">{w.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{w.city}</p>
                        <div className="flex gap-2 w-full mt-2">
                            <button onClick={() => openChat(w)} className="flex-1 bg-gray-800 text-white py-2 rounded font-bold">💬 Chat</button>
                            <button onClick={() => handleBook(w.id)} className="flex-1 bg-green-600 text-white py-2 rounded font-bold">Book Now</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="md:w-1/3">
            <h2 className="text-xl font-bold mb-4">My Status</h2>
            <div className="bg-white p-4 rounded shadow-lg min-h-[300px]">
                {activeBookings.length === 0 ? <p className="text-gray-400">No active bookings.</p> : 
                 activeBookings.map(b => (
                    <div key={b.id} className="border-b pb-2 mb-2">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-700">Worker ID: {b.worker_id}</span>
                            <span className={`text-xs px-2 py-1 rounded font-bold ${b.status==='Accepted'?'bg-green-200':b.status==='Declined'?'bg-red-200':'bg-yellow-200'}`}>{b.status}</span>
                        </div>
                        {b.status === 'Accepted' && (
                            <button onClick={() => openChat({id: b.worker_id, name: 'Worker'})} className="mt-2 w-full bg-blue-600 text-white py-1 rounded text-sm font-bold">💬 Open Chat</button>
                        )}
                    </div>
                 ))
                }
            </div>
        </div>
      </div>

      {/* --- WHATSAPP STYLE CHAT BOX --- */}
      {selectedWorker && (
        <div className="fixed bottom-4 right-4 w-80 md:w-96 h-[500px] bg-[#E5DDD5] border shadow-2xl rounded-xl z-50 flex flex-col">
          <div className="bg-[#075E54] text-white p-3 flex justify-between items-center">
             <div className="flex items-center gap-2"><h3 className="font-bold">{selectedWorker.name}</h3></div>
             <div className="flex gap-3">
                 <button onClick={() => callUser(selectedWorker.id)} className="text-xl hover:text-green-300">📞</button>
                 <button onClick={() => setSelectedWorker(null)} className="text-xl">✕</button>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')]">
            {chatHistory.map((msg, i) => {
                // *** ALIGNMENT FIX ***
                const msgSender = msg.sender_id || msg.senderId;
                const isMe = String(msgSender) === String(clientId);

                return (
                    <div key={i} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`relative px-4 py-2 mb-2 rounded-lg max-w-[75%] text-sm shadow-md break-words 
                            ${isMe ? 'bg-[#dcf8c6] text-black rounded-tr-none' : 'bg-white text-black rounded-tl-none'}`}>
                            {msg.message}
                            <div className="text-[10px] text-gray-500 text-right mt-1">
                                {new Date(msg.timestamp || msg.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={scrollRef} />
          </div>
          <div className="p-2 bg-white flex gap-2">
            <input value={message} onChange={e => setMessage(e.target.value)} onKeyPress={e => e.key==='Enter' && sendMessage()} className="flex-1 border rounded-full px-4 py-2 outline-none" placeholder="Type..." />
            <button onClick={sendMessage} className="bg-[#075E54] text-white p-2 rounded-full w-10 h-10">➤</button>
          </div>
        </div>
      )}
    </div>
  );
}
export default ClientDashboard;