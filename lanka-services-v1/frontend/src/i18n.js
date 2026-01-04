import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "welcome": "Welcome Back!",
      "login_subtitle": "Please login to continue.",
      "register_title": "Create an Account",
      "register_subtitle": "Connect with Electricians, Masons, Plumbers and Helpers.",
      "register_worker": "I am a Worker",
      "register_client": "I want to Hire",
      "name": "Full Name",
      "phone": "Phone Number",
      "password": "Password",
      "role": "Select Job Role",
      "bank_acc": "Bank Account Number",
      "bank_name": "Bank Name",
      "branch": "Branch Name",
      "nic_upload": "Upload NIC Photo",
      "selfie_upload": "Upload Your Selfie",
      "submit_register": "Register Now",
      "submit_login": "Login",
      "no_account": "Don't have an account?",
      "have_account": "Already have an account?",
      "click_register": "Register Here",
      "click_login": "Login Here",
      "success": "Registration Successful!",
      "login_success": "Login Successful!",
      "error": "Something went wrong."
    }
  },
  si: {
    translation: {
      "welcome": "නැවත පැමිණීම ආයුබෝවන්!",
      "login_subtitle": "ඉදිරියට යාමට ඔබගේ ගිණුමට ඇතුල් වන්න.",
      "register_title": "නව ගිණුමක් සදන්න",
      "register_subtitle": "විදුලි කාර්මිකයින්, මේසන් වරුන් සහ සහායකයින් සොයාගන්න.",
      "register_worker": "මම සේවකයෙක්",
      "register_client": "මට සේවකයෙක් අවශ්‍යයි",
      "name": "සම්පූර්ණ නම",
      "phone": "දුරකථන අංකය",
      "password": "මුරපදය",
      "role": "රැකියාව තෝරන්න",
      "bank_acc": "බැංකු ගිණුම් අංකය",
      "bank_name": "බැංකුවේ නම",
      "branch": "ශාඛාව",
      "nic_upload": "ජාතික හැඳුනුම්පතේ ඡායාරූපයක් (NIC)",
      "selfie_upload": "ඔබේ සෙල්ෆි (Selfie) ඡායාරූපයක්",
      "submit_register": "ලියාපදිංචි වන්න",
      "submit_login": "ඇතුල් වන්න (Login)",
      "no_account": "ගිණුමක් නොමැතිද?",
      "have_account": "දැනටමත් ගිණුමක් තිබේද?",
      "click_register": "මෙහි ලියාපදිංචි වන්න",
      "click_login": "මෙතැනින් ඇතුල් වන්න",
      "success": "ලියාපදිංචිය සාර්ථකයි!",
      "login_success": "ඇතුල් වීම සාර්ථකයි!",
      "error": "යම් දෝෂයක් සිදු විය."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "si",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;