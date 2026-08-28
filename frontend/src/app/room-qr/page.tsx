'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { cacheMenu, getCachedMenu, queueOfflineRequest, getQueuedRequests } from '@/lib/db';
import { isOnline, apiRequest } from '@/lib/api';
import { 
  Utensils, 
  Sparkles, 
  Receipt, 
  WifiOff, 
  Plus, 
  Minus, 
  Check, 
  AlertTriangle, 
  Clock, 
  ChefHat, 
  Bike, 
  CheckCircle2, 
  Send, 
  Bot, 
  ShieldCheck,
  Flame,
  Crown
} from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  prep_time: string;
  image_url?: string;
  portion_size?: string;
  spice_level?: string;
  calories?: string;
  allergens?: string[];
  tags?: string[];
  description: string;
}

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  booking_id: number;
  items: OrderItem[];
  total_price: number;
  status: string; // Pending, Preparing, Ready, OutForDelivery, Delivered, Cancelled
  runner_name?: string;
  estimated_minutes?: number;
  special_instructions?: string;
  created_at: string;
  delivered_at?: string;
}

interface FolioData {
  booking_id: number;
  guest_name: string;
  room_number: string;
  room_rate: number;
  total_room_charges: number;
  total_dining_charges: number;
  total_amenity_charges: number;
  subtotal?: number;
  gst_charges?: number;
  grand_total: number;
  charges: Array<{
    id: number;
    charge_type: string;
    description: string;
    amount: number;
    is_paid: boolean;
    created_at: string;
  }>;
}

interface ChatMessage {
  sender: 'ai' | 'guest';
  text: string;
  time: string;
  actionTaken?: string;
}

function GuestRoomQRContent() {
  const searchParams = useSearchParams();
  const roomNumber = searchParams.get('room') || '304';
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'dining' | 'tracker' | 'concierge' | 'amenities' | 'folio'>('dining');
  
  // Booking & Network States
  const [onlineStatus, setOnlineStatus] = useState<boolean>(true);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [guestName, setGuestName] = useState<string>('Guest');
  const [hotelName, setHotelName] = useState<string>('The Grand Palace Resort');
  const [hotelLogo, setHotelLogo] = useState<string>('');
  const [language, setLanguage] = useState<'EN' | 'HI' | 'GU' | 'FR'>('EN');

  // Multi-Language Translation Dictionary (English, Hindi, Gujarati, French)
  const TRANSLATIONS: Record<string, Record<string, string>> = {
    EN: {
      digital_pass: 'Digital Room Pass',
      dining_nav: 'Dining',
      tracker_nav: 'Tracker',
      concierge_nav: 'AI Assistant',
      services_nav: 'Services',
      bill_nav: 'Room Bill',
      gourmet_dining: 'In-Room Gourmet Food Menu',
      cooked_fresh: 'Cooked fresh by expert chefs & delivered to Suite',
      call_reception: '📞 Call Reception (Dial 100)',
      clean_room: '🧹 Clean Room Now',
      extra_towels: '🧼 Extra Towels',
      express_checkout: '💳 Express Check-Out',
      airport_cab: '🚕 Airport Taxi',
      cart_total: 'Total Amount',
      place_order: 'Place Food Order',
      order_now: 'Order Food Now',
      add_to_cart: '+ Add',
      search_food: 'Search food dishes...',
      empty_cart: 'Your cart is empty',
      special_notes: 'Chef Cooking Notes',
      live_tracker: 'Live Food Order Tracker',
      room_folio: 'Room Bill & Receipts',
      ask_ai: 'Ask 24/7 AI Assistant'
    },
    HI: {
      digital_pass: 'डिजिटल रूम पास',
      dining_nav: 'भोजन मेनू',
      tracker_nav: 'लाइव आर्डर',
      concierge_nav: 'AI सहायक',
      services_nav: 'कमरा सफ़ाई',
      bill_nav: 'रूम बिल',
      gourmet_dining: 'कमरे में भोजन मेनू',
      cooked_fresh: 'ताज़ा शेफ द्वारा निर्मित भोजन, कमरे में डिलीवरी',
      call_reception: '📞 रिसेप्शन पर कॉल करें (100)',
      clean_room: '🧹 कमरा साफ़ करें',
      extra_towels: '🧼 अतिरिक्त तौलिया',
      express_checkout: '💳 डायरेक्ट चेक-आउट',
      airport_cab: '🚕 एयरपोर्ट टैक्सी',
      cart_total: 'कुल राशि',
      place_order: 'ऑर्डर भेजें',
      order_now: 'खाना ऑर्डर करें',
      add_to_cart: '+ जोड़ें',
      search_food: 'डिश खोजें...',
      empty_cart: 'आपकी कार्ट खाली है',
      special_notes: 'शेफ के लिए निर्देश',
      live_tracker: 'लाइव आर्डर स्थिति',
      room_folio: 'कमरा खर्च और बिल',
      ask_ai: '24/7 AI सहायक से पूछें'
    },
    GU: {
      digital_pass: 'ડિજિટલ રૂમ પાસ',
      dining_nav: 'જમવાનું મેનૂ',
      tracker_nav: 'લાઈવ ઓર્ડર',
      concierge_nav: 'AI સહાયક',
      services_nav: 'રૂમ સફાઈ',
      bill_nav: 'રૂમ બિલ',
      gourmet_dining: 'રૂમમાં જમવાનું મેનૂ',
      cooked_fresh: 'તાજું જમવાનું, તમારા રૂમમાં ડીલિવરી',
      call_reception: '📞 રિસેપ્શન પર કોલ કરો (100)',
      clean_room: '🧹 રૂમ સાફ કરો',
      extra_towels: '🧼 વધારાના ટુવાલ',
      express_checkout: '💳 ડાયરેક્ટ ચેક-આઉટ',
      airport_cab: '🚕 એરપોર્ટ ટેક્સી',
      cart_total: 'કુલ રકમ',
      place_order: 'ઓર્ડર કરો',
      order_now: 'જમવાનું ઓર્ડર કરો',
      add_to_cart: '+ ઉમેરો',
      search_food: 'વાનગી શોધો...',
      empty_cart: 'તમારી કાર્ટ ખાલી છે',
      special_notes: 'શેફ માટે સૂચના',
      live_tracker: 'લાઈવ ઓર્ડર પરિસ્થિતિ',
      room_folio: 'રૂમ ચાર્જ અને બિલ',
      ask_ai: '24/7 AI સહાયકને પૂછો'
    },
    FR: {
      digital_pass: 'Pass Chambre Numérique',
      dining_nav: 'Menu Repas',
      tracker_nav: 'Commandes',
      concierge_nav: 'Assistant IA',
      services_nav: 'Ménage',
      bill_nav: 'Facture',
      gourmet_dining: 'Menu Repas en Chambre',
      cooked_fresh: 'Cuisiné frais par les chefs & livré en suite',
      call_reception: '📞 Appeler Réception (100)',
      clean_room: '🧹 Nettoyer la Chambre',
      extra_towels: '🧼 Serviettes Plus',
      express_checkout: '💳 Départ Express',
      airport_cab: '🚕 Taxi Aéroport',
      cart_total: 'Montant Total',
      place_order: 'Passer la Commande',
      order_now: 'Commander Maintenant',
      add_to_cart: '+ Ajouter',
      search_food: 'Rechercher un plat...',
      empty_cart: 'Votre panier est vide',
      special_notes: 'Instructions Chef',
      live_tracker: 'Suivi de Commande Live',
      room_folio: 'Reçu et Frais de Chambre',
      ask_ai: 'Demander à l\'IA 24/7'
    }
  };

  const t = (key: string) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.EN[key] || key;
  };
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  
  // Cart state
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  
  // Live Order Tracking State
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  
  // Stay Folio State
  const [folio, setFolio] = useState<FolioData | null>(null);

  // Multi-Currency State (₹ INR, $ USD, € EUR, £ GBP, AED)
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP' | 'AED'>('INR');

  const currencyRates: Record<string, { rate: number; symbol: string }> = {
    INR: { rate: 1, symbol: '₹' },
    USD: { rate: 0.012, symbol: '$' },
    EUR: { rate: 0.011, symbol: '€' },
    GBP: { rate: 0.0094, symbol: '£' },
    AED: { rate: 0.044, symbol: 'AED ' }
  };

  const formatPrice = (priceInINR: number) => {
    const { rate, symbol } = currencyRates[currency] || currencyRates.INR;
    const converted = priceInINR * rate;
    if (currency === 'INR') {
      return `₹${priceInINR.toLocaleString('en-IN')}`;
    }
    return `${symbol}${converted.toFixed(2)}`;
  };

  // Detailed Product Modal State (Eye-Catchy Culinary Layer)
  const [selectedDishDetail, setSelectedDishDetail] = useState<MenuItem | null>(null);
  const [modalDishQty, setModalDishQty] = useState(1);
  const [modalSpiceLevel, setModalSpiceLevel] = useState<'Mild' | 'Medium' | 'Royal Hot'>('Medium');
  const [modalAccompaniment, setModalAccompaniment] = useState<string>('None');

  // Floating Cart Drawer Minimize/Close State
  const [isCartMinimized, setIsCartMinimized] = useState(false);
  const [isFloatingAiOpen, setIsFloatingAiOpen] = useState(false);

  // AI Concierge Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: `Namaste and welcome to Suite ${roomNumber}! I am your 24/7 AI Royal Concierge. How may I assist your palace stay today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Intercom Direct Calling State
  const [isCallActive, setIsCallActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isCallActive) {
      interval = setInterval(() => setCallSeconds(s => s + 1), 1000);
    } else {
      setCallSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const handleVoiceInput = () => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.lang = language === 'HI' ? 'hi-IN' : language === 'GU' ? 'gu-IN' : language === 'FR' ? 'fr-FR' : 'en-IN';
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setChatInput(transcript);
          handleSendChatMessage(transcript);
        }
      };
      
      recognition.start();
    } else {
      alert('Voice input is supported on modern mobile & desktop browsers. Please type your request.');
    }
  };

  // Amenities state
  const [amenityCategory, setAmenityCategory] = useState('Amenity');
  const [amenityDetails, setAmenityDetails] = useState('');
  const [amenitySubmitted, setAmenitySubmitted] = useState(false);

  // Offline queue indicator
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [showSyncAlert, setShowSyncAlert] = useState(false);

  // 1. Initial Load & PWA Service Worker Registration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOnlineStatus(navigator.onLine);
      
      // Register PWA Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('PWA ServiceWorker error:', err));
      }
      
      const handleOnline = () => {
        setOnlineStatus(true);
        checkPendingRequests();
      };
      const handleOffline = () => setOnlineStatus(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // 2. Fetch booking, menu, orders, settings, and folio
  const loadGuestData = async () => {
    try {
      // Fetch Hotel Settings
      apiRequest('/api/v1/admin/settings')
        .then(s => { 
          if (s?.hotel_name) setHotelName(s.hotel_name); 
          if (s?.logo_url) setHotelLogo(s.logo_url);
        })
        .catch(() => {});

      // Booking check
      const bookingData = await apiRequest(`/api/v1/qr_menu/booking-by-room?room=${roomNumber}`);
      setBookingId(bookingData.booking_id);
      setGuestName(bookingData.guest_name);
      
      // Menu fetch
      const remoteMenu = await apiRequest('/api/v1/qr_menu');
      setMenuItems(remoteMenu);
      await cacheMenu(remoteMenu);

      // Fetch active orders for this booking
      if (bookingData.booking_id) {
        const ordersData = await apiRequest(`/api/v1/qr_menu/orders?booking_id=${bookingData.booking_id}`);
        setActiveOrders(ordersData);

        // Fetch Folio
        const folioData = await apiRequest(`/api/v1/qr_menu/folio/${bookingData.booking_id}`);
        setFolio(folioData);
      }
    } catch (err) {
      console.warn('Using local fallback mode for guest portal', err);
      setBookingId(1);
      setGuestName('Valued Resident');
      const cached = await getCachedMenu();
      if (cached && cached.length > 0) {
        setMenuItems(cached);
      }
    } finally {
      setLoading(false);
      checkPendingRequests();
    }
  };

  useEffect(() => {
    loadGuestData();
    const interval = setInterval(() => {
      if (bookingId) {
        apiRequest(`/api/v1/qr_menu/orders?booking_id=${bookingId}`)
          .then(data => setActiveOrders(data))
          .catch(() => {});
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [roomNumber, bookingId]);

  const checkPendingRequests = async () => {
    const queued = await getQueuedRequests();
    setPendingSyncCount(queued.length);
  };

  // Cart operations
  const addToCart = (id: number) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => {
      const updated = { ...prev };
      if (updated[id] > 1) {
        updated[id]--;
      } else {
        delete updated[id];
      }
      return updated;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [id, qty]) => {
      const item = menuItems.find(m => m.id === parseInt(id));
      return total + (item ? item.price * qty : 0);
    }, 0);
  };

  // Submit Order (Dining)
  const submitOrder = async () => {
    if (Object.keys(cart).length === 0) return;
    setOrderSubmitting(true);

    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const item = menuItems.find(m => m.id === parseInt(id))!;
      return {
        id: item.id,
        name: item.name,
        quantity: qty,
        price: item.price
      };
    });

    const orderData = {
      booking_id: bookingId || 1,
      items: orderItems,
      total_price: getCartTotal(),
      special_instructions: specialInstructions.trim() || undefined
    };

    if (onlineStatus) {
      try {
        const newOrder = await apiRequest('/api/v1/qr_menu/order', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });
        setCart({});
        setSpecialInstructions('');
        setActiveOrders(prev => [newOrder, ...prev]);
        setActiveTab('tracker');
      } catch (err: any) {
        handleOfflineOrder(orderData);
      } finally {
        setOrderSubmitting(false);
      }
    } else {
      handleOfflineOrder(orderData);
      setOrderSubmitting(false);
    }
  };

  const handleOfflineOrder = async (orderData: any) => {
    await queueOfflineRequest('order', orderData);
    setCart({});
    await checkPendingRequests();
    setShowSyncAlert(true);
    setTimeout(() => setShowSyncAlert(false), 5000);
  };

  // AI Concierge Message Send
  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim()) return;

    const newMsg: ChatMessage = {
      sender: 'guest',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    if (!presetText) setChatInput('');
    setChatLoading(true);

    try {
      const response = await apiRequest('/api/v1/concierge/chat', {
        method: 'POST',
        body: JSON.stringify({
          room_number: roomNumber,
          booking_id: bookingId,
          message: textToSend
        })
      });

      const aiMsg: ChatMessage = {
        sender: 'ai',
        text: response.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionTaken: response.action_taken
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: "I am momentarily having trouble reaching our concierge server. Please dial 0 on your room phone or use the Room Support tab.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Submit Amenity Ticket
  const submitAmenityRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amenityDetails.trim()) return;

    const requestMsg = `Suite ${roomNumber}: Need ${amenityCategory} - ${amenityDetails}`;
    const ticketData = {
      from_phone: `Room-${roomNumber}`,
      message_text: requestMsg
    };

    if (onlineStatus) {
      try {
        await apiRequest('/api/v1/whatsapp', {
          method: 'POST',
          body: JSON.stringify(ticketData)
        });
        setAmenitySubmitted(true);
        setAmenityDetails('');
        setTimeout(() => setAmenitySubmitted(false), 6000);
      } catch (err) {
        handleOfflineTicket(ticketData);
      }
    } else {
      handleOfflineTicket(ticketData);
    }
  };

  const handleOfflineTicket = async (ticketData: any) => {
    await queueOfflineRequest('ticket', ticketData);
    setAmenitySubmitted(true);
    setAmenityDetails('');
    await checkPendingRequests();
    setShowSyncAlert(true);
    setTimeout(() => {
      setShowSyncAlert(false);
      setAmenitySubmitted(false);
    }, 5000);
  };

  const categories = ['All', 'Starters', 'Indian Mains', 'Biryani & Rice', 'Breads', 'Desserts', 'Beverages'];
  const filteredMenuItems = selectedCategory === 'All'
    ? menuItems
    : menuItems.filter(m => m.category === selectedCategory);

  const getStageIndex = (status: string) => {
    switch (status) {
      case 'Pending': return 0;
      case 'Preparing': return 1;
      case 'Ready': return 2;
      case 'OutForDelivery': return 3;
      case 'Delivered': return 4;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-neutral-400 text-sm font-semibold tracking-wide">Connecting to Suite {roomNumber} Experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-neutral-950 flex flex-col pb-24 relative selection:bg-amber-500 selection:text-neutral-950">
      
      {/* Network Status Header */}
      <div className={`text-[11px] py-1.5 px-4 text-center font-bold flex items-center justify-center gap-2 transition-colors ${onlineStatus ? 'bg-neutral-900/90 text-green-400 border-b border-neutral-800' : 'bg-red-950 text-red-400 border-b border-red-900'}`}>
        {onlineStatus ? (
          <>
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>Palace Wi-Fi Connected • Suite {roomNumber}</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5 animate-pulse" />
            <span>Offline Mode Active • In-App Caching Enabled</span>
          </>
        )}
      </div>

      {/* Multi-Language & Multi-Currency Selector Bar */}
      <div className="bg-neutral-900/90 px-4 py-2 border-b border-neutral-800 space-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-neutral-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
            <span>🌐</span>
            <span>Language:</span>
          </span>
          <div className="flex gap-1">
            {[
              { code: 'EN', label: 'English' },
              { code: 'HI', label: 'हिन्दी' },
              { code: 'GU', label: 'ગુજરાતી' },
              { code: 'FR', label: 'Français' }
            ].map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code as any)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition border ${
                  language === lang.code
                    ? 'bg-amber-500 text-neutral-950 border-amber-400 font-extrabold'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-neutral-800/60">
          <span className="text-neutral-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
            <span>💱</span>
            <span>Currency:</span>
          </span>
          <div className="flex gap-1">
            {['INR', 'USD', 'EUR', 'GBP', 'AED'].map(cur => (
              <button
                key={cur}
                type="button"
                onClick={() => setCurrency(cur as any)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition border ${
                  currency === cur
                    ? 'bg-amber-500 text-neutral-950 border-amber-400 font-extrabold shadow'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                {cur === 'INR' ? '₹ INR' : cur === 'USD' ? '$ USD' : cur === 'EUR' ? '€ EUR' : cur === 'GBP' ? '£ GBP' : 'AED'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Luxury Hero Header with Custom Logo */}
      <header className="p-5 bg-gradient-to-b from-neutral-900 to-neutral-950 border-b border-neutral-800/80 shadow-md">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {hotelLogo ? (
              <img 
                src={hotelLogo} 
                alt="Hotel Logo" 
                className="h-11 w-11 rounded-xl object-cover border border-amber-500/40 shrink-0 shadow-md"
              />
            ) : (
              <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-neutral-950 font-extrabold shadow-md shrink-0">
                <Crown className="h-6 w-6" />
              </div>
            )}
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-amber-500 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {t('digital_pass')}
              </span>
              <h1 className="text-lg font-extrabold text-neutral-100 mt-0.5">{guestName}</h1>
              <p className="text-[11px] text-neutral-400">{t('suite')} {roomNumber} • {hotelName}</p>
            </div>
          </div>

          <div className="text-right">
            <button 
              onClick={() => setActiveTab('folio')}
              className="p-2 bg-neutral-850 hover:bg-neutral-800 rounded-xl border border-neutral-700/60 text-amber-400 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>{t('bill_nav')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Offline Sync Toast */}
      {showSyncAlert && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-sm bg-amber-500 text-neutral-950 text-xs font-bold py-3 px-4 rounded-xl shadow-2xl flex items-center gap-2.5 border border-amber-600 animate-bounce">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>Offline! Request saved locally. Will transmit automatically upon reconnecting.</span>
        </div>
      )}

      {/* Main Tab Views */}
      <main className="flex-1 p-4 overflow-y-auto">

        {/* 1. GOURMET DINING TAB */}
        {activeTab === 'dining' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-amber-500" />
                  {t('gourmet_dining')}
                </h2>
                <p className="text-neutral-400 text-xs">{t('cooked_fresh')} {roomNumber}.</p>
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat ? 'bg-amber-500 text-neutral-950 shadow-md font-extrabold' : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Items List with Food Photography & Nutrition */}
            <div className="space-y-3.5 pt-1">
              {filteredMenuItems.map(item => (
                <div 
                  key={item.id} 
                  className="p-3.5 bg-neutral-900/90 border border-neutral-800/80 rounded-2xl flex flex-col justify-between shadow-lg hover:border-amber-500/40 transition group"
                >
                  {/* Clickable Area for Full Product Details */}
                  <div 
                    onClick={() => {
                      setSelectedDishDetail(item);
                      setModalDishQty(cart[item.id] || 1);
                    }}
                    className="flex gap-3.5 cursor-pointer"
                  >
                    {/* Dish Photo */}
                    <div className="h-20 w-20 rounded-xl overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800 relative">
                      <img 
                        src={item.image_url || "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600"} 
                        alt={item.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute bottom-1 right-1 bg-neutral-950/80 text-[8px] font-extrabold text-amber-400 px-1 py-0.2 rounded backdrop-blur-sm">
                        View ↗
                      </span>
                    </div>

                    {/* Dish Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">{item.category}</span>
                            {item.spice_level && (
                              <span className="text-[9px] text-neutral-400 font-semibold">{item.spice_level}</span>
                            )}
                          </div>
                          <h3 className="font-bold text-neutral-100 mt-0.5 text-xs truncate group-hover:text-amber-400 transition">{item.name}</h3>
                        </div>
                        <span className="text-amber-400 font-extrabold text-xs shrink-0">{formatPrice(item.price)}</span>
                      </div>

                      <p className="text-neutral-400 text-[11px] mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                      
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500">
                        <span>{item.portion_size || 'Serves 1-2'}</span>
                        {item.calories && <span>• {item.calories}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-neutral-800/60">
                    <button
                      onClick={() => {
                        setSelectedDishDetail(item);
                        setModalDishQty(cart[item.id] || 1);
                      }}
                      className="text-[10px] text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1"
                    >
                      <span>🔍 View Details & Allergens</span>
                    </button>

                    {cart[item.id] ? (
                      <div className="flex items-center bg-neutral-800 border border-neutral-700 rounded-xl p-0.5">
                        <button onClick={() => removeFromCart(item.id)} className="p-1 hover:bg-neutral-700 rounded-lg text-amber-500 transition">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-neutral-100">{cart[item.id]}</span>
                        <button onClick={() => addToCart(item.id)} className="p-1 hover:bg-neutral-700 rounded-lg text-amber-500 transition">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item.id)}
                        className="py-1 px-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-[11px] rounded-xl transition shadow-md flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add to Order
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. LIVE ORDER TRACKER TAB */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                <Bike className="h-5 w-5 text-amber-500" />
                Live Order & Delivery Tracker
              </h2>
              <p className="text-neutral-400 text-xs">Real-time status updates directly from our royal culinary brigade.</p>
            </div>

            {activeOrders.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/40">
                <ChefHat className="h-10 w-10 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-neutral-300">No Active Dining Orders</p>
                <p className="text-xs text-neutral-500 mt-1">Browse our royal menu and place your first in-room service order.</p>
                <button
                  onClick={() => setActiveTab('dining')}
                  className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow"
                >
                  Explore Dining Menu →
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {activeOrders.map(order => (
                  <div key={order.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex justify-between items-start pb-3 border-b border-neutral-800">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-amber-500">Order #{order.id}</span>
                        <h3 className="font-bold text-sm text-neutral-100">Suite {roomNumber} Dining Service</h3>
                        <span className="text-[10px] text-neutral-400">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <span className="text-sm font-extrabold text-amber-400">₹{order.total_price.toFixed(2)}</span>
                    </div>

                    {/* 5-Stage Live Delivery Progression */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-extrabold">
                        <span className="text-neutral-400">Preparation & Delivery Progress</span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          order.status === 'Delivered' ? 'bg-green-950 text-green-400 border border-green-700/60' : 'bg-amber-950 text-amber-400 border border-amber-600/40 animate-pulse'
                        }`}>
                          {order.status === 'Pending' ? '1/5 Received' :
                           order.status === 'Preparing' ? '2/5 Cooking' :
                           order.status === 'Ready' ? '3/5 Plated' :
                           order.status === 'OutForDelivery' ? '4/5 Runner En Route' : '5/5 Delivered'}
                        </span>
                      </div>

                      {/* Progression Bar */}
                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        {[
                          { label: 'Received', statusKey: 'Pending' },
                          { label: 'Cooking', statusKey: 'Preparing' },
                          { label: 'Plated', statusKey: 'Ready' },
                          { label: 'En Route', statusKey: 'OutForDelivery' },
                          { label: 'Delivered', statusKey: 'Delivered' }
                        ].map((stage, idx) => {
                          const orderStageIdx = 
                            order.status === 'Pending' ? 0 :
                            order.status === 'Preparing' ? 1 :
                            order.status === 'Ready' ? 2 :
                            order.status === 'OutForDelivery' ? 3 : 4;
                          const isCompleted = idx <= orderStageIdx;
                          const isCurrent = idx === orderStageIdx;

                          return (
                            <div key={idx} className="space-y-1 text-center">
                              <div className={`h-1.5 rounded-full transition-all duration-500 ${
                                isCompleted ? 'bg-amber-500 shadow-sm' : 'bg-neutral-800'
                              } ${isCurrent && order.status !== 'Delivered' ? 'animate-pulse ring-2 ring-amber-500/50' : ''}`} />
                              <span className={`text-[9px] font-bold block truncate ${
                                isCompleted ? 'text-amber-400' : 'text-neutral-600'
                              }`}>
                                {stage.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Runner Callout if OutForDelivery */}
                    {order.status === 'OutForDelivery' && (
                      <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-700/60 flex items-center justify-between text-xs animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-purple-900 text-purple-300">
                            <Bike className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-purple-200 block">{order.runner_name || 'Royal Butler'}</span>
                            <span className="text-[10px] text-purple-300">At Suite {roomNumber} door in ~{order.estimated_minutes || 5} mins</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold text-purple-300 bg-purple-900/60 px-2 py-1 rounded-lg border border-purple-600/40">
                          En Route 🚪
                        </span>
                      </div>
                    )}

                    {/* Order Items List */}
                    <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800/80 text-xs space-y-1.5">
                      <p className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider">Dishes in Order</p>
                      {order.items.map((it, i) => (
                        <div key={i} className="flex justify-between items-center text-neutral-300">
                          <span>{it.quantity}x {it.name}</span>
                          <span className="font-semibold">₹{(it.price * it.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. 24/7 AI CONCIERGE CHAT TAB */}
        {activeTab === 'concierge' && (
          <div className="flex flex-col h-[calc(100vh-12rem)]">
            <div className="pb-3 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                  <Bot className="h-5 w-5 text-amber-500" />
                  Royal AI Concierge (24/7)
                </h2>
                <p className="text-neutral-400 text-xs">Instant palace assistance, housekeeping dispatch & local Jaipur guides.</p>
              </div>
              <span className="text-[10px] font-extrabold text-green-400 bg-green-950/60 border border-green-700/60 px-2 py-0.5 rounded-full">
                AI Online
              </span>
            </div>

            {/* Chat message thread */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'guest' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.sender === 'guest'
                        ? 'bg-amber-500 text-neutral-950 font-semibold rounded-br-none shadow-lg'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-none shadow-md'
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.actionTaken && (
                      <div className="mt-2 pt-2 border-t border-neutral-750 text-[10px] text-green-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Dispatched to Staff: {msg.actionTaken}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-neutral-500 mt-1 px-1">{msg.time}</span>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 p-3 rounded-2xl max-w-[60%]">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                  <span>AI Concierge is typing...</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {[
                'Need 2 extra towels',
                'What time is palace breakfast?',
                'Book royal spa session',
                'Order late checkout'
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => handleSendChatMessage(prompt)}
                  className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-800 hover:border-amber-500/50 rounded-lg text-[10px] font-semibold whitespace-nowrap transition"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2 pt-2 border-t border-neutral-800">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Ask Concierge anything about your stay..."
                className="flex-1 bg-neutral-900 border border-neutral-700/80 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => handleSendChatMessage()}
                disabled={!chatInput.trim() || chatLoading}
                className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 rounded-xl transition shadow flex items-center justify-center"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* 4. ROOM AMENITIES & SERVICE REQUESTS TAB */}
        {activeTab === 'amenities' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Housekeeping & Amenity Dispatch
              </h2>
              <p className="text-neutral-400 text-xs">Direct dispatch to on-duty housekeeping team for Suite {roomNumber}.</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
              {amenitySubmitted ? (
                <div className="py-8 text-center space-y-2 animate-in fade-in">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                  <h4 className="font-extrabold text-sm text-neutral-100">Housekeeping Request Dispatched!</h4>
                  <p className="text-xs text-neutral-400">Our on-duty floor attendant has received your request and is attending to Suite {roomNumber}.</p>
                  <button
                    onClick={() => setAmenitySubmitted(false)}
                    className="mt-3 px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-bold rounded-xl border border-neutral-700"
                  >
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={submitAmenityRequest} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Select Service Category</label>
                    <select
                      value={amenityCategory}
                      onChange={(e) => setAmenityCategory(e.target.value)}
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800/90 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Housekeeping - Extra Linens & Towels">Extra Linens & Plush Bath Sheets</option>
                      <option value="Housekeeping - Room Turndown Service">Evening Palace Turndown Service</option>
                      <option value="Housekeeping - Toiletries & Spa Kits">Replenish Luxury Spa Toiletries</option>
                      <option value="Maintenance - Air Conditioning / Tech">Climate Control & Technical Assistance</option>
                      <option value="Luggage - Porter Assistance">Baggage & Porter Assistance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Specific Instructions / Needs</label>
                    <textarea
                      required
                      rows={3}
                      value={amenityDetails}
                      onChange={(e) => setAmenityDetails(e.target.value)}
                      placeholder="e.g. Please bring 2 extra bath sheets and replace herbal tea selection."
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800/90 p-3 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl transition shadow-lg"
                  >
                    Submit Request
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

      </main>

      {/* DETAILED EYE-CATCHY PRODUCT POPUP MODAL (WITH FOOD ICONS DOODLE WALLPAPER) */}
      {selectedDishDetail && (
        <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          
          <div className="relative max-w-lg w-full bg-neutral-900 border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl my-8">
            
            {/* WHATSAPP-STYLE FOOD ICONS DOODLE BACKGROUND PATTERN */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.06] select-none overflow-hidden leading-relaxed text-lg tracking-widest text-amber-400 flex flex-wrap p-4 break-all">
              🍕 🍲 🍗 🍛 🥘 🥗 🍰 🍷 🫖 🥟 🍤 🍜 🌶️ 🥣 🧁 🥐 🍓 🥑 🥥 🥞 🫔 🫕 🍱 🧆
              🍕 🍲 🍗 🍛 🥘 🥗 🍰 🍷 🫖 🥟 🍤 🍜 🌶️ 🥣 🧁 🥐 🍓 🥑 🥥 🥞 🫔 🫕 🍱 🧆
              🍕 🍲 🍗 🍛 🥘 🥗 🍰 🍷 🫖 🥟 🍤 🍜 🌶️ 🥣 🧁 🥐 🍓 🥑 🥥 🥞 🫔 🫕 🍱 🧆
              🍕 🍲 🍗 🍛 🥘 🥗 🍰 🍷 🫖 🥟 🍤 🍜 🌶️ 🥣 🧁 🥐 🍓 🥑 🥥 🥞 🫔 🫕 🍱 🧆
              🍕 🍲 🍗 🍛 🥘 🥗 🍰 🍷 🫖 🥟 🍤 🍜 🌶️ 🥣 🧁 🥐 🍓 🥑 🥥 🥞 🫔 🫕 🍱 🧆
            </div>

            {/* Hero Image & Top Badges */}
            <div className="relative h-56 w-full overflow-hidden bg-neutral-950">
              <img 
                src={selectedDishDetail.image_url || "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800"} 
                alt={selectedDishDetail.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-black/60" />

              {/* Close Button */}
              <button 
                onClick={() => setSelectedDishDetail(null)}
                className="absolute top-3.5 right-3.5 h-9 w-9 bg-neutral-950/80 hover:bg-neutral-900 text-neutral-300 hover:text-white rounded-full border border-neutral-700 flex items-center justify-center transition shadow-lg z-20"
              >
                ✕
              </button>

              {/* Category & Spice Badges */}
              <div className="absolute top-3.5 left-3.5 flex gap-1.5 z-20">
                <span className="text-[10px] font-extrabold uppercase bg-amber-500 text-neutral-950 px-2.5 py-1 rounded-full shadow">
                  {selectedDishDetail.category}
                </span>
                {selectedDishDetail.spice_level && (
                  <span className="text-[10px] font-bold bg-neutral-950/90 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-full backdrop-blur-md">
                    {selectedDishDetail.spice_level}
                  </span>
                )}
              </div>

              {/* Price & Name Badge */}
              <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end z-20">
                <div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight drop-shadow-md">
                    {selectedDishDetail.name}
                  </h3>
                </div>
                <div className="text-right bg-neutral-950/85 px-3 py-1.5 rounded-xl border border-amber-500/50 backdrop-blur-md">
                  <span className="text-lg font-extrabold text-amber-400">₹{selectedDishDetail.price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Rich Specifications & Nutrition Details */}
            <div className="relative p-5 space-y-4 z-10 text-xs">
              
              {/* Portion, Calories & Prep Specs Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-neutral-500 block">Portion Size</span>
                  <span className="font-extrabold text-neutral-200">{selectedDishDetail.portion_size || 'Serves 1-2 (450g)'}</span>
                </div>

                <div className="p-2.5 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-neutral-500 block">Calories</span>
                  <span className="font-extrabold text-amber-400">{selectedDishDetail.calories || '420 kcal'}</span>
                </div>

                <div className="p-2.5 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-neutral-500 block">Prep Time</span>
                  <span className="font-extrabold text-neutral-200">{selectedDishDetail.prep_time || '15-20 min'}</span>
                </div>
              </div>

              {/* Culinary Description */}
              <div className="space-y-1 bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800/80">
                <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider flex items-center gap-1">
                  <ChefHat className="h-3.5 w-3.5" />
                  Royal Culinary Recipe & Preparation:
                </span>
                <p className="text-neutral-300 text-xs leading-relaxed">
                  {selectedDishDetail.description || 'Artisanal recipe prepared fresh by our royal master chefs using hand-ground spices and organic ingredients.'}
                </p>
              </div>

              {/* Allergen & Dietary Checklist */}
              {selectedDishDetail.allergens && selectedDishDetail.allergens.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-extrabold text-neutral-400 tracking-wider">
                    Allergen & Dietary Verification:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDishDetail.allergens.map((alg, i) => (
                      <span key={i} className="text-[10px] font-bold px-2.5 py-1 bg-neutral-950 text-neutral-300 border border-neutral-700 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                        {alg}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Footer: Quantity Selector & Add Button */}
              <div className="pt-2 border-t border-neutral-800 flex items-center gap-3">
                {/* Quantity */}
                <div className="flex items-center bg-neutral-950 border border-neutral-700 rounded-2xl p-1 shrink-0">
                  <button 
                    onClick={() => setModalDishQty(prev => Math.max(1, prev - 1))}
                    className="h-8 w-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold flex items-center justify-center transition"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-3 font-extrabold text-sm text-neutral-100">{modalDishQty}</span>
                  <button 
                    onClick={() => setModalDishQty(prev => prev + 1)}
                    className="h-8 w-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold flex items-center justify-center transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Add to Order Button */}
                <button
                  onClick={() => {
                    setCart(prev => ({
                      ...prev,
                      [selectedDishDetail.id]: (prev[selectedDishDetail.id] || 0) + modalDishQty
                    }));
                    setIsCartMinimized(false);
                    setSelectedDishDetail(null);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-extrabold text-xs rounded-2xl transition shadow-xl flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add to Room Service • ₹{(selectedDishDetail.price * modalDishQty).toFixed(2)}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* FLOATING CHECKOUT DRAWER (WITH CLOSE, MINIMIZE & CLEAR CONTROLS) */}
      {activeTab === 'dining' && Object.keys(cart).length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 max-w-md mx-auto px-4 z-40">
          {isCartMinimized ? (
            /* Minimized Floating Cart Pill */
            <div className="bg-neutral-900 border border-amber-500/80 rounded-2xl p-3 shadow-2xl flex items-center justify-between backdrop-blur-xl animate-in slide-in-from-bottom-2">
              <div 
                onClick={() => setIsCartMinimized(false)}
                className="flex items-center gap-2.5 cursor-pointer flex-1"
              >
                <div className="h-7 w-7 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center font-extrabold text-xs">
                  {Object.values(cart).reduce((a, b) => a + b, 0)}
                </div>
                <div>
                  <span className="text-xs font-extrabold text-neutral-100">Review Room Order</span>
                  <span className="text-xs font-bold text-amber-400 block">₹{getCartTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCartMinimized(false)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow"
                >
                  Order Now →
                </button>
                <button
                  onClick={() => setCart({})}
                  className="p-1.5 text-neutral-500 hover:text-red-400 transition"
                  title="Clear Cart"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            /* Expanded Full Cart Drawer with Close & Clear Controls */
            <div className="bg-neutral-900 border border-amber-500/50 rounded-2xl p-4 shadow-2xl space-y-3 backdrop-blur-lg animate-in slide-in-from-bottom-2">
              
              {/* Drawer Top Header with Close & Clear Buttons */}
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-300">
                    {Object.values(cart).reduce((a, b) => a + b, 0)} Items Selected
                  </span>
                  <button
                    onClick={() => setCart({})}
                    className="text-[10px] text-neutral-500 hover:text-red-400 underline font-semibold"
                  >
                    Clear All
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-amber-400">₹{getCartTotal().toFixed(2)}</span>
                  <button
                    onClick={() => setIsCartMinimized(true)}
                    className="h-6 w-6 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-xs font-bold transition"
                    title="Minimize Tray"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Order Submit Button */}
              <button
                onClick={submitOrder}
                disabled={orderSubmitting}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-neutral-950 font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
              >
                {orderSubmitting ? 'Placing Order...' : 'Confirm Room Service Order →'}
              </button>

              {/* Quick Dietary & Allergen Selector Chips */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-extrabold uppercase text-amber-400 flex items-center gap-1">
                    <span>🥗</span> Dietary & Allergen Safety Requirements:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: 'Strict Jain (No Onion/Garlic)', icon: '🌿' },
                    { tag: 'Nut Allergy Alert', icon: '🚫' },
                    { tag: 'Lactose / Dairy Free', icon: '🥛' },
                    { tag: 'Gluten Free', icon: '🌾' },
                    { tag: 'Pure Veg', icon: '🟢' },
                    { tag: 'Mild Spice (Less Spicy)', icon: '🥣' },
                    { tag: 'Extra Hot & Spicy', icon: '🌶️' },
                  ].map(({ tag, icon }) => {
                    const isSelected = specialInstructions.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSpecialInstructions(prev => prev.replace(tag, '').replace(/,\s*,/g, ',').trim().replace(/^,\s*|,\s*$/g, ''));
                          } else {
                            setSpecialInstructions(prev => prev ? `${prev}, ${tag}` : tag);
                          }
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition flex items-center gap-1 ${
                          isSelected 
                            ? 'bg-amber-500 text-neutral-950 border-amber-500 font-extrabold shadow' 
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                        }`}
                      >
                        <span>{icon}</span>
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <input
                type="text"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Additional Chef notes: e.g. Extra napkins, no spicy chutney..."
                className="w-full bg-neutral-950 border border-neutral-700/80 rounded-xl px-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Floating 24/7 AI Royal Concierge Pearl Button */}
      <button
        onClick={() => setIsFloatingAiOpen(!isFloatingAiOpen)}
        className="fixed bottom-20 right-4 z-40 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 p-3 rounded-full shadow-2xl border border-amber-300 transition transform active:scale-95 flex items-center gap-1.5 font-extrabold text-xs"
        title="Ask 24/7 AI Hotel Assistant"
      >
        <Sparkles className="h-4 w-4 animate-spin-slow" />
        <span>💬 Ask AI Assistant</span>
      </button>

      {/* Floating AI Hotel Assistant Drawer */}
      {isFloatingAiOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex flex-col justify-end max-w-md mx-auto animate-in slide-in-from-bottom-6">
          <div className="bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-white">24/7 AI Hotel Assistant</h3>
                  <p className="text-[10px] text-neutral-400">Suite {roomNumber} • Quick Hotel Service & Order</p>
                </div>
              </div>
              <button
                onClick={() => setIsFloatingAiOpen(false)}
                className="h-7 w-7 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Service Request Pills with Direct Reception Intercom Call */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsCallActive(true)}
                className="px-2.5 py-1 bg-green-950/80 border border-green-700 hover:border-green-500 text-green-300 text-[10px] font-extrabold rounded-xl transition flex items-center gap-1 shadow animate-pulse"
              >
                <span>{t('call_reception')}</span>
              </button>
              {[
                { label: t('clean_room'), text: 'Please send housekeeping to clean Suite ' + roomNumber },
                { label: t('extra_towels'), text: 'Please bring 2 fresh luxury bath towels to Suite ' + roomNumber },
                { label: '📶 Wi-Fi', text: 'What is the high-speed Wi-Fi password for Suite ' + roomNumber + '?' },
                { label: t('express_checkout'), text: 'I want to execute express check-out for Suite ' + roomNumber },
                { label: t('airport_cab'), text: 'I need to book a taxi transfer for tomorrow morning.' },
              ].map(({ label, text }) => (
                <button
                  key={label}
                  onClick={() => handleSendChatMessage(text)}
                  className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 hover:border-amber-500/60 text-neutral-300 text-[10px] font-bold rounded-xl transition"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[160px] p-2 bg-neutral-950 rounded-2xl border border-neutral-800">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'guest' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                    msg.sender === 'guest'
                      ? 'bg-amber-500 text-neutral-950 font-semibold rounded-br-none'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-none space-y-1'
                  }`}>
                    <p>{msg.text}</p>
                    <span className="text-[9px] opacity-60 block text-right">{msg.time}</span>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="text-[10px] text-neutral-500 italic animate-pulse">AI Concierge is typing response...</div>
              )}
            </div>

            {/* Chat Input with Voice Assistant Microphone */}
            <div className="flex gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`p-2 rounded-xl border transition flex items-center justify-center shrink-0 ${
                  isListening
                    ? 'bg-red-500 text-white border-red-400 animate-bounce'
                    : 'bg-neutral-950 text-amber-400 border-neutral-800 hover:border-amber-500/60'
                }`}
                title="Speak to AI Concierge (Hindi/English/French/Gujarati)"
              >
                <span>{isListening ? '🔴' : '🎙️'}</span>
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder={isListening ? 'Listening to your voice...' : 'Ask AI Concierge or speak...'}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => handleSendChatMessage()}
                disabled={chatLoading || !chatInput.trim()}
                className="px-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl transition disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Reception WebRTC Intercom Audio Call Modal */}
      {isCallActive && (
        <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95">
            <div className="mx-auto h-20 w-20 bg-green-500/20 text-green-400 border border-green-500/40 rounded-full flex items-center justify-center text-3xl shadow-xl animate-pulse">
              📞
            </div>

            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-green-400 block">
                Direct Front Desk Speed-Dial (Dial 100)
              </span>
              <h3 className="text-lg font-extrabold text-white mt-1">Calling Palace Reception...</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Suite {roomNumber} • High-Definition Audio Intercom</p>
            </div>

            {/* Call Timer & Audio Wave */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2">
              <span className="text-xl font-extrabold font-mono text-amber-400 block">
                {Math.floor(callSeconds / 60).toString().padStart(2, '0')}:{(callSeconds % 60).toString().padStart(2, '0')}
              </span>
              <div className="flex items-center justify-center gap-1 h-6">
                <span className="w-1 bg-green-400 h-3 animate-bounce rounded-full" />
                <span className="w-1 bg-green-400 h-5 animate-bounce delay-100 rounded-full" />
                <span className="w-1 bg-green-400 h-2 animate-bounce delay-200 rounded-full" />
                <span className="w-1 bg-green-400 h-6 animate-bounce delay-150 rounded-full" />
                <span className="w-1 bg-green-400 h-4 animate-bounce delay-75 rounded-full" />
              </div>
            </div>

            <button
              onClick={() => setIsCallActive(false)}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-2xl transition shadow-xl flex items-center justify-center gap-2"
            >
              <span>🔴 End Call</span>
            </button>
          </div>
        </div>
      )}
      {/* Pending Sync alert badge */}
      {pendingSyncCount > 0 && (
        <div className="fixed bottom-20 left-4 z-40 bg-neutral-900 border border-neutral-700 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 text-amber-400 font-semibold shadow-2xl animate-pulse">
          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          <span>{pendingSyncCount} offline actions queued</span>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800 grid grid-cols-5 py-2.5 z-40">
        <button
          onClick={() => setActiveTab('dining')}
          className={`flex flex-col items-center justify-center transition-colors ${activeTab === 'dining' ? 'text-amber-400 font-bold' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          <Utensils className="h-5 w-5 mb-1" />
          <span className="text-[9px]">{t('dining_nav')}</span>
        </button>

        <button
          onClick={() => setActiveTab('tracker')}
          className={`flex flex-col items-center justify-center transition-colors relative ${activeTab === 'tracker' ? 'text-amber-400 font-bold' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          <Bike className="h-5 w-5 mb-1" />
          <span className="text-[9px]">{t('tracker_nav')}</span>
          {activeOrders.some(o => o.status !== 'Delivered') && (
            <span className="absolute top-0 right-3 h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('concierge')}
          className={`flex flex-col items-center justify-center transition-colors ${activeTab === 'concierge' ? 'text-amber-400 font-bold' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          <Bot className="h-5 w-5 mb-1" />
          <span className="text-[9px]">{t('concierge_nav')}</span>
        </button>

        <button
          onClick={() => setActiveTab('amenities')}
          className={`flex flex-col items-center justify-center transition-colors ${activeTab === 'amenities' ? 'text-amber-400 font-bold' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          <Sparkles className="h-5 w-5 mb-1" />
          <span className="text-[9px]">{t('services_nav')}</span>
        </button>

        <button
          onClick={() => setActiveTab('folio')}
          className={`flex flex-col items-center justify-center transition-colors ${activeTab === 'folio' ? 'text-amber-400 font-bold' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          <Receipt className="h-5 w-5 mb-1" />
          <span className="text-[9px]">{t('bill_nav')}</span>
        </button>
      </nav>
    </div>
  );
}

export default function GuestRoomQRPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-neutral-400 text-sm">Loading Room Experience...</p>
        </div>
      </div>
    }>
      <GuestRoomQRContent />
    </Suspense>
  );
}
