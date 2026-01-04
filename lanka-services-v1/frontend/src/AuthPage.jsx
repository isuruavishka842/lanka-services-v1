import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam'; // කැමරාව සඳහා

function AuthPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const webcamRef = useRef(null); // කැමරාව පාලනයට
  
  const [isLoginView, setIsLoginView] = useState(true); 
  const [userType, setUserType] = useState('client'); 

  // Selfie එක ගත්තද නැද්ද?
  const [capturedImage, setCapturedImage] = useState(null); 

  const [values, setValues] = useState({
    name: '', phone: '', password: '', jobType: 'Electrician',
    bankAcc: '', bankName: '', branch: ''
  });

  // NIC Front & Back Files
  const [nicFiles, setNicFiles] = useState({
    nicFront: null,
    nicBack: null
  });

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleNicChange = (e) => {
    setNicFiles({ ...nicFiles, [e.target.name]: e.target.files[0] });
  };

  const changeLanguage = (lng) => i18n.changeLanguage(lng);

  // --- Selfie ගන්න Function එක ---
  const captureSelfie = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
  }, [webcamRef]);

  // Selfie එක නැවත ගැනීමට
  const retakeSelfie = () => {
    setCapturedImage(null);
  }

  // Base64 රූපය File එකක් බවට හැරවීම (Backend එකට යවන්න)
  const dataURLtoFile = (dataurl, filename) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8081/login', {
        phone: values.phone, password: values.password
      });
      if(res.data.status === "Success") {
        toast.success("Login Successful!");
        localStorage.setItem('userId', res.data.userId); 
        if(res.data.role === 'client') navigate('/client-dashboard');
        else navigate('/worker-dashboard');
      } else {
        toast.error(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Login Error");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('role', userType);
    formData.append('name', values.name);
    formData.append('phone', values.phone);
    formData.append('password', values.password);

    if (userType === 'worker') {
        // Validation: Selfie එකක් අරන් නැත්නම් Error එකක්
        if(!capturedImage) {
            toast.error("Please take a live selfie!");
            return;
        }

        formData.append('jobType', values.jobType);
        formData.append('bankAcc', values.bankAcc);
        formData.append('bankName', values.bankName);
        formData.append('branch', values.branch);
        
        // NIC Images
        formData.append('nicFrontImage', nicFiles.nicFront);
        formData.append('nicBackImage', nicFiles.nicBack);
        
        // Live Selfie Image (Converted to File)
        const selfieFile = dataURLtoFile(capturedImage, 'selfie.jpg');
        formData.append('selfieImage', selfieFile);
    }

    try {
      await axios.post('http://localhost:8081/register', formData);
      toast.success(t('success'));
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Registration Failed. Check inputs.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center font-sans pb-10">
      
      <nav className="w-full bg-blue-700 p-4 text-white shadow-md flex justify-between items-center fixed top-0 z-50">
        <h1 className="text-xl font-bold">Lanka Services</h1>
        <div className="space-x-2">
          <button onClick={() => changeLanguage('si')} className="px-3 py-1 bg-white text-blue-700 rounded text-xs font-bold">සිංහල</button>
          <button onClick={() => changeLanguage('en')} className="px-3 py-1 bg-white text-blue-700 rounded text-xs font-bold">English</button>
        </div>
      </nav>

      <div className="mt-24 p-6 bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        
        {isLoginView ? (
          <div>
            <h2 className="text-3xl font-bold text-center text-blue-800 mb-2">{t('welcome')}</h2>
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <button onClick={() => setUserType('client')} className={`flex-1 py-2 rounded font-semibold text-sm ${userType === 'client' ? 'bg-white text-blue-600 shadow' : 'text-gray-500'}`}>{t('register_client')}</button>
              <button onClick={() => setUserType('worker')} className={`flex-1 py-2 rounded font-semibold text-sm ${userType === 'worker' ? 'bg-white text-green-600 shadow' : 'text-gray-500'}`}>{t('register_worker')}</button>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              <input type="tel" name="phone" onChange={handleChange} className="w-full p-3 border rounded-lg" placeholder={t('phone')} required />
              <input type="password" name="password" onChange={handleChange} className="w-full p-3 border rounded-lg" placeholder={t('password')} required />
              <button type="submit" className="w-full py-3 bg-blue-700 text-white font-bold rounded-lg">{t('submit_login')}</button>
            </form>
            <p className="mt-4 text-center text-blue-600 cursor-pointer" onClick={() => setIsLoginView(false)}>{t('click_register')}</p>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">{t('register_title')}</h2>
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <button onClick={() => setUserType('client')} className={`flex-1 py-2 rounded font-semibold text-sm ${userType === 'client' ? 'bg-white text-blue-600 shadow' : 'text-gray-500'}`}>{t('register_client')}</button>
              <button onClick={() => setUserType('worker')} className={`flex-1 py-2 rounded font-semibold text-sm ${userType === 'worker' ? 'bg-white text-green-600 shadow' : 'text-gray-500'}`}>{t('register_worker')}</button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <input type="text" name="name" onChange={handleChange} className="w-full p-2 border rounded" placeholder={t('name')} required />
              <input type="tel" name="phone" onChange={handleChange} className="w-full p-2 border rounded" placeholder={t('phone')} required />
              <input type="password" name="password" onChange={handleChange} className="w-full p-2 border rounded" placeholder={t('password')} required />

              {userType === 'worker' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded space-y-3">
                 <select name="jobType" onChange={handleChange} className="w-full p-2 border rounded bg-white">
                    <option value="Electrician">Electrician (විදුලි කාර්මික)</option>
                    <option value="Plumber">Plumber (ජලනල කාර්මික)</option>
                    <option value="Mason">Mason (මේසන් වැඩ)</option>
                    <option value="Helper">Helper (අත් උදව්)</option>
                    <option value="Carpenter">Carpenter (වඩු කාර්මික)</option>
                    <option value="Painter">Painter (තීන්ත ආලේපක)</option>
                    <option value="CCTV Tech">CCTV Technician</option>
                    <option value="AC Repair">AC Repair (වායු සමීකරණ)</option>
                    <option value="Aluminum">Aluminum Fabricator</option>
                    <option value="Welder">Welder (වෑල්ඩින් වැඩ)</option>
                    <option value="Gardener">Gardener (වතු වැඩ)</option>
                    <option value="Cleaner">Cleaner (පිරිසිදු කරන්නන්)</option>
                </select>
                  <input type="text" name="bankName" onChange={handleChange} className="w-full p-2 border rounded" placeholder={t('bank_name')} required />
                  <input type="text" name="branch" onChange={handleChange} className="w-full p-2 border rounded" placeholder={t('branch')} required />
                  // AuthPage.jsx එකේ අදාළ තැනට මේ Input එක දාන්න
<input type="text" name="city" onChange={handleChange} className="w-full p-2 border rounded" placeholder="Your City (ඔබේ නගරය)" required />
                  <input type="text" name="bankAcc" onChange={handleChange} className="w-full p-2 border rounded" placeholder={t('bank_acc')} required />
                  
                  {/* NIC Uploads */}
                  <div className="border-t pt-2">
                    <label className="text-xs font-bold text-gray-600">NIC Front Side (ඉදිරිපස)</label>
                    <input type="file" name="nicFront" onChange={handleNicChange} className="w-full text-sm mb-2" required />
                    
                    <label className="text-xs font-bold text-gray-600">NIC Back Side (පිටුපස)</label>
                    <input type="file" name="nicBack" onChange={handleNicChange} className="w-full text-sm" required />
                  </div>

                  {/* Live Selfie Camera */}
                  <div className="border-t pt-2 text-center">
                    <label className="text-sm font-bold text-red-600 block mb-2">Live Selfie Required (සජීවී ඡායාරූපයක් ගන්න)</label>
                    
                    {capturedImage ? (
                        <div>
                            <img src={capturedImage} alt="Selfie" className="w-full rounded mb-2"/>
                            <button type="button" onClick={retakeSelfie} className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Retake</button>
                        </div>
                    ) : (
                        <div>
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                className="w-full rounded mb-2"
                                videoConstraints={{ facingMode: "user" }}
                            />
                            <button type="button" onClick={captureSelfie} className="bg-red-600 text-white px-4 py-2 rounded-full font-bold">Capture Photo</button>
                        </div>
                    )}
                  </div>

                </div>
              )}

              <button type="submit" className="w-full py-3 bg-green-600 text-white font-bold rounded shadow">{t('submit_register')}</button>
            </form>
            <p className="mt-4 text-center text-blue-600 cursor-pointer" onClick={() => setIsLoginView(true)}>{t('click_login')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthPage;