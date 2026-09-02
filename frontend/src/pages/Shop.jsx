import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CreditCard, ArrowLeft, Loader2, CheckCircle2, Clock, Smartphone, Headphones, MessageSquare } from 'lucide-react';
import { apiRequest, getStoredUser } from '../utils/api';
import MobileLayout from '../components/MobileLayout';

const PACKAGES = [
  { id: 'pkg-1', name: 'Starter Pack', coins: 100, price: 99, popular: false, desc: 'Perfect for quick voice conversations' },
  { id: 'pkg-2', name: 'Popular Pack', coins: 500, price: 399, popular: true, desc: 'Great value for longer video chat sessions' },
  { id: 'pkg-3', name: 'Mega Pack', coins: 1000, price: 699, popular: false, desc: 'Unlimited talk time with global matching' }
];

export default function Shop() {
  const [loading, setLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [paymentStep, setPaymentStep] = useState('shop'); // 'shop', 'scanner', 'pending_verification'
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('/logo.jpg');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const user = getStoredUser();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiRequest('/api/admin/settings');
        if (response && response.qrCodeUrl) {
          setQrCodeUrl(response.qrCodeUrl);
        }
      } catch (err) {
        console.error('Failed to load payment QR code', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSelectPack = (pack) => {
    setSelectedPack(pack);
    setPaymentStep('scanner');
    setError('');
    setTransactionId('');
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!transactionId.trim() || transactionId.trim().length < 8) {
      setError('Please enter a valid Transaction UTR ID (min 8 digits)');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await apiRequest('/api/wallet/recharge/request', 'POST', {
        coins: selectedPack.coins,
        amount: selectedPack.price,
        transactionId: transactionId.trim()
      });
      setPaymentStep('pending_verification');
    } catch (err) {
      setError(err.message || 'Failed to submit payment proof');
    } finally {
      setSubmitting(false);
    }
  };

  const getFullQrUrl = () => {
    if (qrCodeUrl.startsWith('http')) return qrCodeUrl;
    return `http://localhost:5000${qrCodeUrl}`;
  };

  return (
    <MobileLayout title="Coin Store">
      <div className="px-4 py-4 flex flex-col gap-4 flex-grow relative min-h-0 overflow-y-auto">
        
        {/* Header Back Button */}
        {paymentStep === 'shop' && (
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-xs font-bold self-start mb-1"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
        )}

        {paymentStep === 'shop' && (
          <>
            {/* Header info */}
            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 p-4 rounded-3xl shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl shrink-0">
                🪙
              </div>
              <div>
                <h3 className="font-extrabold text-sm">Refill Your Wallet</h3>
                <p className="text-[10px] text-amber-950 font-semibold mt-0.5">
                  Your current balance is: <span className="font-extrabold text-xs bg-white/30 px-1.5 py-0.5 rounded-md">{user ? user.coins : 100} Coins</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-2xl border border-red-100 font-semibold">
                {error}
              </div>
            )}

            {/* List packages */}
            <div className="flex flex-col gap-4">
              {PACKAGES.map((pack) => (
                <div 
                  key={pack.id} 
                  className={`bg-white border rounded-3xl p-5 relative overflow-hidden transition-all flex justify-between items-center ${
                    pack.popular 
                      ? 'border-primary-500 shadow-md ring-2 ring-primary-500/10' 
                      : 'border-slate-200 shadow-sm'
                  }`}
                >
                  {pack.popular && (
                    <div className="absolute top-0 right-0 bg-primary-500 text-white text-[8px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                      Best Value
                    </div>
                  )}

                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                      <span>🪙 {pack.coins} Coins</span>
                      {pack.popular && <Sparkles size={14} className="text-yellow-500 animate-bounce" />}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{pack.desc}</p>
                  </div>

                  <button
                    onClick={() => handleSelectPack(pack)}
                    className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs shadow-sm transition-all active:scale-[0.98] shrink-0 ${
                      pack.popular 
                        ? 'bg-primary-600 hover:bg-primary-700 text-white' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                    }`}
                  >
                    ₹{pack.price}
                  </button>
                </div>
              ))}
            </div>

            {/* Terms and conditions */}
            <p className="text-[9px] text-slate-400 text-center px-6 mt-2">
              Coins require admin transaction approval. Please enter correct transaction UTR to verify your payment.
            </p>

            {/* 🎧 Help Desk & WhatsApp Support Card */}
            <div 
              onClick={() => navigate('/help')}
              className="bg-emerald-50 border border-emerald-200 rounded-3xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-emerald-100/60 transition-all mt-2 shrink-0"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-sm shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-[11px] text-emerald-950 flex items-center gap-1">
                    <span>Payment & Recharge Support</span>
                    <span className="text-[8px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full uppercase">WhatsApp</span>
                  </h4>
                  <p className="text-[9px] text-emerald-700 font-medium">
                    Need instant coin approval? Chat with Help Desk
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-xl shadow-sm">
                Chat ➔
              </span>
            </div>
          </>
        )}

        {/* Scanner State Screen */}
        {paymentStep === 'scanner' && (
          <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-3xl p-5 shadow-sm min-h-0">
            <button 
              onClick={() => setPaymentStep('shop')} 
              className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-xs font-bold self-start mb-4"
            >
              <ArrowLeft size={16} />
              <span>Back to Packages</span>
            </button>

            <div className="text-center mb-4">
              <h3 className="font-extrabold text-sm text-slate-800">Scan QR Code to Pay</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Pay ₹{selectedPack?.price} for {selectedPack?.coins} Coins</p>
            </div>

            {/* Mock QR Scanner image */}
            <div className="flex flex-col items-center justify-center p-3 border border-slate-100 rounded-2xl bg-slate-50 w-full max-w-[200px] mx-auto shadow-inner">
              <img 
                src={getFullQrUrl()} 
                alt="UPI Scanner QR" 
                className="w-40 h-40 object-contain rounded-xl border border-slate-200 bg-white shadow-sm"
              />
            </div>

            {/* Payment apps branding */}
            <div className="flex justify-center items-center gap-4 mt-3 mb-4 text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">
              <span>GPay</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span>PhonePe</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span>Paytm UPI</span>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-[10px] p-2.5 rounded-xl border border-red-100 font-semibold mb-3">
                {error}
              </div>
            )}

            {/* Form details input proof */}
            <form onSubmit={handleSubmitProof} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase pl-0.5">
                  Enter Transaction ID / UTR Number
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 12-digit UPI Transaction ID"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-primary-200 transition-all active:scale-[0.98] disabled:opacity-50 mt-1"
              >
                {submitting ? 'Submitting proof...' : 'Confirm & Submit Payment'}
              </button>
            </form>
          </div>
        )}

        {/* Pending Approval Screen */}
        {paymentStep === 'pending_verification' && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center text-center p-8 rounded-b-3xl">
            <Clock className="h-16 w-16 text-amber-500 animate-pulse mb-6" />
            <h3 className="font-extrabold text-lg text-slate-800">Request Sent to Admin!</h3>
            <p className="text-xs text-slate-500 mt-2 px-4 leading-relaxed">
              Aapki ₹{selectedPack?.price} ki transaction request submit ho gayi hai. Admin details verify karke **{selectedPack?.coins} Coins** aapke account mein 10-15 minutes mein credit kar dega.
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-3.5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-1.5">
              UTR: {transactionId}
            </p>

            <button
              onClick={() => {
                setPaymentStep('shop');
                navigate(-1);
              }}
              className="mt-8 px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-primary-200 transition-all active:scale-95"
            >
              Back to Chat
            </button>
          </div>
        )}

      </div>
    </MobileLayout>
  );
}
