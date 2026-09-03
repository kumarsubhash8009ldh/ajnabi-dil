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
    whatsappNumber1: '+91 9876543211',
    whatsappNumber2: '+91 9876543212',
    whatsappNumber3: '+91 9876543213',
    whatsappNumber: '+91 9876543211',
    supportEmail: 'support@ajnabidil.com',
    supportHours: '8:00 AM – 10:00 PM (Daily)',
    helpText: 'Official Help Desk for Coin Recharges, Host KYC Verification & Payout Assistance.'
  });
  
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);
  const [ticketTopic, setTicketTopic] = useState('Recharge / Coin Issue');
  const [ticketMsg, setTicketMsg] = useState('');

  // Check if current time is within 8:00 AM to 10:00 PM
  const isOnline = (() => {
    const currentHour = new Date().getHours();
    return currentHour >= 8 && currentHour < 22;
  })();

  useEffect(() => {
    const fetchSupport = async () => {
      try {
        const data = await apiRequest('/api/support/info');
        if (data) {
          setSupportInfo(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.warn('Using default support details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupport();
  }, []);

  const handleOpenWhatsAppLine = (phoneRaw, customText) => {
    const clean = (phoneRaw || '').replace(/[^0-9]/g, '');
    const defaultMsg = customText || `Hello Ajnabi Dil Official Support Desk, I need help with: ${ticketTopic}. ${ticketMsg ? `Details: ${ticketMsg}` : ''}`;
    const url = `https://wa.me/${clean}?text=${encodeURIComponent(defaultMsg.trim())}`;
    window.open(url, '_blank');
  };

  const handleOpenWhatsApp = (customText) => {
    let targetPhone = supportInfo.whatsappNumber1 || supportInfo.whatsappNumber || '+91 9876543211';
    if (ticketTopic.includes('KYC') || ticketTopic.includes('Withdrawal')) {
      targetPhone = supportInfo.whatsappNumber2 || targetPhone;
    } else if (ticketTopic.includes('Calling') || ticketTopic.includes('Report')) {
      targetPhone = supportInfo.whatsappNumber3 || targetPhone;
    }
    handleOpenWhatsAppLine(targetPhone, customText);
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const whatsappLines = [
    {
      id: 'line1',
      title: 'WhatsApp Line 1 (Recharge & Payments)',
      subtitle: 'Coin Recharges, UPI Payment Verification & Wallet Issues',
      badge: 'VIP Support',
      number: supportInfo.whatsappNumber1 || supportInfo.whatsappNumber || '+91 9876543211',
      color: 'from-emerald-600 to-teal-700',
      tagColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'line2',
      title: 'WhatsApp Line 2 (Host KYC & Accounts)',
      subtitle: 'Host Partner Program, KYC Verification & Cashout/Withdrawal',
      badge: 'Host Desk',
      number: supportInfo.whatsappNumber2 || '+91 9876543212',
      color: 'from-pink-600 to-rose-700',
      tagColor: 'bg-pink-100 text-pink-800'
    },
    {
      id: 'line3',
      title: 'WhatsApp Line 3 (Technical & Urgent Help)',
      subtitle: 'Audio/Video Calling Issues, Room Chat & Account Help',
      badge: 'Urgent Tech',
      number: supportInfo.whatsappNumber3 || '+91 9876543213',
      color: 'from-indigo-600 to-blue-700',
      tagColor: 'bg-indigo-100 text-indigo-800'
    }
  ];

  return (
    <MobileLayout title="Help Desk & Support">
      <div className="p-4 flex flex-col gap-4 flex-1 relative min-h-0 overflow-y-auto">
        
        {/* Banner Header with 8:00 AM – 10:00 PM Timings */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white rounded-3xl p-5 shadow-lg flex flex-col gap-3 relative overflow-hidden border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
                <Headphones size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Official Help Desk</h3>
                <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5 mt-0.5">
                  <Clock size={11} className="text-pink-400" />
                  <span>Service Time: 8:00 AM – 10:00 PM (Daily)</span>
                </span>
              </div>
            </div>

            {/* Live Operational Status Indicator */}
            <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border shadow-sm ${
              isOnline 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
            Coin Recharge, Host Verification (KYC), Withdrawal Payouts ya Calling issues ke liye niche diye gaye 3 WhatsApp Helpdesk numbers par message karein.
          </p>
        </div>

        {/* 🟢 3 DEDICATED WHATSAPP SUPPORT NUMBERS */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare size={14} className="text-emerald-600" />
              <span>Choose WhatsApp Support Line (3 Numbers)</span>
            </h4>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              Instant Reply
            </span>
          </div>

          {whatsappLines.map((line) => (
            <div 
              key={line.id} 
              className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-2.5"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md ${line.tagColor}`}>
                        {line.badge}
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-900 mt-0.5">
                      {line.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {line.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(line.number, line.id)}
                  className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all shrink-0"
                  title="Copy Number"
                >
                  {copiedKey === line.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  <span>{copiedKey === line.id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-xs font-black text-slate-700 font-mono tracking-wide">
                  {line.number}
                </span>
                <button
                  onClick={() => handleOpenWhatsAppLine(line.number)}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow active:scale-95 transition-all flex items-center gap-1"
                >
                  <MessageSquare size={13} />
                  <span>Chat on WhatsApp</span>
                </button>
              </div>
            </div>
          ))}
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
            {copiedKey === 'email' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            <span>{copiedKey === 'email' ? 'Copied' : 'Copy'}</span>
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
