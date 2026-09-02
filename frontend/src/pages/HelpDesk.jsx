import React, { useEffect, useState } from 'react';
import { 
  Headphones, MessageSquare, Phone, Mail, Clock, HelpCircle, 
  ChevronDown, ChevronUp, Copy, Check, ExternalLink, ShieldCheck, 
  CreditCard, Award, ArrowRight 
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import MobileLayout from '../components/MobileLayout';

const FAQ_ITEMS = [
  {
    question: "🪙 Coin Recharge add nahi hua? Kaise check karein?",
    answer: "UPI payment ke baad Transaction ID / UTR number Wallet me submit karein. Admin 5-15 minute me verify karke approve kar deta hai. Urgent verification ke liye WhatsApp par screenshot send karein."
  },
  {
    question: "👩 Calling Partner Host kaise bane aur 70% commission kaise milega?",
    answer: "Profile section me jakar 'Host Partner Program (KYC)' par click karein aur apna ID proof, PAN card, live selfie aur phone number submit karein. Admin verification ke baad aapko Partner ID aur 70% share (70/30 split) mil jayega."
  },
  {
    question: "💸 Withdrawal (Cashout) kitni der me bank/UPI me aayega?",
    answer: "Host withdrawal request minimum Rs. 500 (500 Coins) ki honi chahiye. Request lagane ke baad Admin UPI transfer ke through 15-30 minute ke andar payout complete kar deta hai."
  },
  {
    question: "🔒 Kya mere documents aur mobile number safe hain?",
    answer: "Haan, 100% safe aur encrypted hain. Aapka mobile number, email, aur ID proofs public profile par show nahi hote, yeh sirf Platform Admin ke verification ke liye rehte hain."
  },
  {
    question: "📡 Live Show kaun start kar sakta hai?",
    answer: "Verified Partner Hosts kisi bhi waqt Go Live kar sakti hain. Normal users ke wallet me kam se kam Rs. 500 (500 Coins) hone par wo bhi Live Stream broadcast kar sakte hain."
  }
];

export default function HelpDesk() {
  const [supportInfo, setSupportInfo] = useState({
    whatsappNumber: '+91 9876543210',
    supportEmail: 'support@ajnabidil.com',
    supportHours: '24x7 Live Customer Care',
    helpText: 'Official Help Desk for Coin Recharges, Host KYC Verification & Payout Assistance.'
  });
  
  const [loading, setLoading] = useState(true);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [ticketTopic, setTicketTopic] = useState('Recharge / Coin Issue');
  const [ticketMsg, setTicketMsg] = useState('');

  useEffect(() => {
    const fetchSupport = async () => {
      try {
        const data = await apiRequest('/api/support/info');
        if (data) {
          setSupportInfo(data);
        }
      } catch (err) {
        console.warn('Using default support details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupport();
  }, []);

  const cleanPhone = (supportInfo.whatsappNumber || '').replace(/[^0-9]/g, '');

  const handleOpenWhatsApp = (customText) => {
    const defaultMsg = customText || `Hello Ajnabi Dil Support Desk, I need help with: ${ticketTopic}. ${ticketMsg ? `Details: ${ticketMsg}` : ''}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMsg.trim())}`;
    window.open(url, '_blank');
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'phone') {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  return (
    <MobileLayout title="Help Desk & Support">
      <div className="p-4 flex flex-col gap-4 flex-1 relative min-h-0 overflow-y-auto">
        
        {/* Banner Header */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-800 text-white rounded-3xl p-5 shadow-lg flex flex-col gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Headphones size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">24x7 Official Help Desk</h3>
                <span className="text-[10px] text-emerald-200 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
                  <span>{supportInfo.supportHours}</span>
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-emerald-100 leading-relaxed font-medium">
            Coin Recharge, Host Verification (KYC), Withdrawal Payouts ya Technical help ke liye direct WhatsApp Support se baat karein.
          </p>
        </div>

        {/* 🟢 OFFICIAL WHATSAPP SUPPORT ACTION CARD */}
        <div className="bg-white border-2 border-emerald-500/30 rounded-3xl p-5 shadow-sm flex flex-col gap-3.5">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              {/* WhatsApp Icon */}
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-200">
                <MessageSquare size={24} />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-600">
                  Official WhatsApp Care
                </span>
                <h4 className="text-base font-extrabold text-slate-800 font-mono">
                  {supportInfo.whatsappNumber}
                </h4>
              </div>
            </div>

            <button
              onClick={() => handleCopy(supportInfo.whatsappNumber, 'phone')}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
              title="Copy Number"
            >
              {copiedNumber ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              <span>{copiedNumber ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Quick Click to WhatsApp Button */}
          <button
            onClick={() => handleOpenWhatsApp()}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-xs shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <MessageSquare size={16} />
            <span>Chat on WhatsApp Now (Instant Reply)</span>
          </button>
        </div>

        {/* ✉️ SUPPORT EMAIL & QUICK CONTACT */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Mail size={18} />
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">
                Support Email
              </span>
              <a 
                href={`mailto:${supportInfo.supportEmail}`} 
                className="text-xs font-bold text-slate-800 hover:text-indigo-600"
              >
                {supportInfo.supportEmail}
              </a>
            </div>
          </div>

          <button
            onClick={() => handleCopy(supportInfo.supportEmail, 'email')}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
          >
            {copiedEmail ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* 📝 DIRECT QUERY / TICKET GENERATOR */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-1.5 pl-0.5">
            <ShieldCheck size={16} className="text-primary-600" />
            <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
              Send Support Query via WhatsApp
            </h4>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase pl-0.5">Select Topic</label>
            <select
              value={ticketTopic}
              onChange={(e) => setTicketTopic(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="Recharge / Coin Issue">🪙 Recharge / Coin Balance Issue</option>
              <option value="Host Partner KYC Help">👩 Host Partner KYC & Verification</option>
              <option value="Withdrawal Settlement Issue">💸 Withdrawal / Payout Assistance</option>
              <option value="Calling & Video Quality Issue">📞 Call / Video Technical Quality</option>
              <option value="Report User or Account Issue">⚠️ Report a User / Account Help</option>
              <option value="Other General Query">❓ Other General Query</option>
            </select>

            <textarea
              value={ticketMsg}
              onChange={(e) => setTicketMsg(e.target.value)}
              rows={2}
              placeholder="Describe your issue or transaction details (optional)..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white resize-none"
            />

            <button
              onClick={() => handleOpenWhatsApp()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all mt-1"
            >
              <span>Forward to WhatsApp Support</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* ❓ FREQUENTLY ASKED QUESTIONS (FAQ) */}
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center gap-1.5 pl-1">
            <HelpCircle size={14} className="text-pink-600" />
            <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
              Frequently Asked Questions (FAQ)
            </h4>
          </div>

          <div className="flex flex-col gap-2">
            {FAQ_ITEMS.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm transition-all"
              >
                <div 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex justify-between items-center cursor-pointer select-none"
                >
                  <span className="text-xs font-bold text-slate-800 pr-2">{item.question}</span>
                  {openFaq === idx ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                </div>

                {openFaq === idx && (
                  <p className="text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-100 leading-relaxed font-medium">
                    {item.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
