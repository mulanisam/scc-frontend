import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();
    const [lang, setLang] = useState(localStorage.getItem('preferredLanguage') || 'en');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const translations = {
        en: {
            "nav-home": "Home",
            "nav-about": "About Us",
            "nav-services": "Services",
            "nav-portfolio": "Portfolio",
            "nav-blog": "Blog",
            "nav-login": "Billing Login",
            "nav-quote": "Get Quote",
            "hero-badge": "Premium Live Broiler Supplier in Solapur",
            "hero-title-1": "Quality Poultry",
            "hero-title-2": "Trust Delivered",
            "hero-desc": "We supply high-standard live broiler chickens across Solapur and Maharashtra. Partnering with industry leaders like Suguna, Venkys, and Baramati Agro to bring you the healthiest breeds.",
            "hero-btn-order": "Place Order",
            "hero-btn-breeds": "View Breeds",
            "partners-title": "Sourcing Premium Quality From Industry Leaders",
            "about-badge": "About Us",
            "about-title": "Deep Roots in Solapur's Poultry Tradition",
            "about-p1": "Based in the heart of Solapur district's rural area, we are a dedicated team of broiler traders committed to bridging the gap between premium hatcheries and the local market.",
            "about-p2": "We understand the importance of breed quality, feed conversion, and mortality rates. That's why we exclusively trade in livestock from certified giants like Suguna, Baramati Agro, and Venkys.",
            "stat-experience": "Years Experience",
            "stat-quality": "Quality Assurance",
            "stat-supply": "Supply Chain",
            "stat-network": "Network Reach",
            "services-badge": "Our Offerings",
            "services-title": "Premium Broiler Breeds & Services",
            "services-desc": "We provide a wide variety of broiler breeds suited for different market needs, ensuring optimal weight gain and meat quality.",
            "service-1-title": "Live Broiler Supply",
            "service-1-desc": "Consistent supply of live broiler birds ranging from 1.5kg to 3kg+. We ensure birds are stress-free during transport.",
            "service-2-title": "Contract Trading",
            "service-2-desc": "We facilitate contracts between farmers and buyers. Sourcing directly from reputable farms.",
            "service-3-title": "Logistics & Transport",
            "service-3-desc": "Specialized poultry transport vehicles equipped to handle rural Solapur roads.",
            "why-badge": "Why Choose Us",
            "why-title": "Standardizing the Poultry Trade in Rural Maharashtra",
            "why-desc": "We don't just sell chickens; we sell trust. In a market where quality can vary, we stand firm on our promise.",
            "why-1-title": "Premium Quality",
            "why-1-desc": "Birds sourced from bio-secure farms with strict vaccination schedules.",
            "why-2-title": "Honest Weighing",
            "why-2-desc": "Digital weighing scales and transparent billing processes.",
            "why-3-title": "Local Expertise",
            "why-3-desc": "Deep understanding of Solapur's rural market dynamics and logistics.",
            "testimonials-title": "What Our Clients Say",
            "contact-badge": "Get In Touch",
            "contact-title": "Ready to Order Premium Broilers?",
            "contact-desc": "Fill out the form below or contact us directly. We are available for inquiries regarding daily rates, bulk orders, and supply contracts.",
            "contact-btn": "Send Inquiry",
            "footer-desc": "Your trusted partner for high-quality live broiler chickens in Solapur district.",
            "footer-links": "Quick Links",
            "footer-products": "Our Products"
        },
        mr: {
            "nav-home": "मुख्य पृष्ठ",
            "nav-about": "आमच्याबद्दल",
            "nav-services": "सेवा",
            "nav-portfolio": "पोर्टफोलिओ",
            "nav-blog": "ब्लॉग",
            "nav-login": "बिलिंग लॉगिन",
            "nav-quote": "ऑर्डर करा",
            "hero-badge": "सोलापूरमधील प्रीमियम लाइव्ह ब्रॉयलर पुरवठादार",
            "hero-title-1": "उच्च दर्जाची पोल्ट्री",
            "hero-title-2": "विश्वास आणि गुणवत्ता",
            "hero-desc": "आम्ही सोलापूर आणि महाराष्ट्रात उच्च दर्जाचे लाइव्ह ब्रॉयलर चिकन पुरवतो. सुगुना, वेंकीज आणि बारामती ॲग्रो सारख्या नामांकित कंपन्यांसोबत भागीदारी.",
            "hero-btn-order": "ऑर्डर करा",
            "hero-btn-breeds": "आमच्या जाती पहा",
            "partners-title": "उद्योग क्षेत्रातील नेत्यांकडून प्रीमियम गुणवत्तेचे सोर्सिंग",
            "about-badge": "आमच्याबद्दल",
            "about-title": "सोलापूरच्या पोल्ट्री व्यवसायात आमचे स्थान",
            "about-p1": "सोलापूर जिल्ह्याच्या ग्रामीण भागाच्या मध्यभागी स्थित, आम्ही प्रीमियम हॅचरीज आणि स्थानिक बाजारपेठ यांच्यातील अंतर कमी करण्यासाठी वचनबद्ध असलेली ब्रॉयलर व्यापाऱ्यांची एक समर्पित टीम आहोत.",
            "about-p2": "आम्हाला जातीची गुणवत्ता, फीड रूपांतरण आणि मृत्युदर यांचे महत्त्व समजते. म्हणूनच आम्ही फक्त सुगुना, बारामती ॲग्रो आणि वेंकीजसारख्या प्रमाणित दिग्गजांच्या पशुधनाचा व्यापार करतो.",
            "stat-experience": "वर्षे अनुभव",
            "stat-quality": "गुणवत्ता हमी",
            "stat-supply": "पुरवठा साखळी",
            "stat-network": "नेटवर्क पोहोच",
            "services-badge": "आमच्या सेवा",
            "services-title": "प्रीमियम ब्रॉयलर जाती आणि सेवा",
            "services-desc": "आम्ही विविध बाजारपेठेतील गरजांसाठी उपयुक्त विविध ब्रॉयलर जाती पुरवतो.",
            "service-1-title": "जिवंत ब्रॉयलर पुरवठा",
            "service-1-desc": "1.5kg ते 3kg+ पर्यंतच्या जिवंत ब्रॉयलर पक्ष्यांचा सातत्यपूर्ण पुरवठा.",
            "service-2-title": "काँट्रॅक्ट ट्रेडिंग",
            "service-2-desc": "आम्ही शेतकरी आणि खरेदीदार यांच्यात कराराची सुविधा देतो.",
            "service-3-title": "लॉजिस्टिक्स आणि वाहतूक",
            "service-3-desc": "ग्रामीण सोलापूरच्या रस्त्यांवरून प्रवास करण्यासाठी सुसज्ज विशेष पोल्ट्री वाहतूक वाहने.",
            "why-badge": "आम्हीच का?",
            "why-title": "ग्रामीण महाराष्ट्रातील पोल्ट्री व्यापारात प्रमाणीकरण",
            "why-desc": "आम्ही फक्त कोंबड्या विकत नाही; आम्ही विश्वास विकतो.",
            "why-1-title": "प्रीमियम गुणवत्ता",
            "why-1-desc": "कडक लसीकरण वेळापत्रक असलेल्या बायो-सिक्युअर फार्ममधून आणलेले पक्षी.",
            "why-2-title": "प्रामाणिक वजन",
            "why-2-desc": "डिजिटल वजन काटे आणि पारदर्शक बिलिंग प्रक्रिया.",
            "why-3-title": "स्थानिक कौशल्य",
            "why-3-desc": "सोलापूरच्या ग्रामीण बाजारपेठेतील गतीशीलता आणि लॉजिस्टिक्सची खोल समज.",
            "testimonials-title": "आमचे ग्राहक काय म्हणतात",
            "contact-badge": "संपर्क साधा",
            "contact-title": "प्रीमियम ब्रॉयलर ऑर्डर करण्यास तयार आहात?",
            "contact-desc": "खालील फॉर्म भरा किंवा आमच्याशी थेट संपर्क साधा.",
            "contact-btn": "चौकशी पाठवा",
            "footer-desc": "सोलापूर जिल्ह्यातील उच्च दर्जाच्या जिवंत ब्रॉयलर चिकनसाठी तुमचा विश्वासार्ह भागीदार.",
            "footer-links": "क्विक लिंक्स",
            "footer-products": "आमची उत्पादने"
        }
    };
    const t = (key) => translations[lang]?.[key] || translations['en']?.[key] || key;
    const changeLanguage = (newLang) => {
        setLang(newLang);
        localStorage.setItem('preferredLanguage', newLang);
    };
    const handleLoginClick = () => {
        navigate('/login');
    };
    const handleFormSubmit = (e) => {
        e.preventDefault();
        alert('Thank you for your inquiry! We will contact you shortly. / तुमच्या चौकशीबद्दल धन्यवाद! आम्ही लवकरच तुमच्याशी संपर्क साधू.');
    };
    return (
        <div className="bg-gray-50 text-gray-800 antialiased" style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}>
            {/* Navigation */}
            <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex-shrink-0 flex items-center gap-2">
                            <i className="fa-solid fa-feather text-orange-600 text-2xl"></i>
                            <span className="font-bold text-xl tracking-tight text-gray-900">SOHEL<span className="text-orange-600">CHICKEN</span></span>
                        </div>
                        <div className="hidden md:flex space-x-6 items-center">
                            <a href="#home" className="text-gray-600 hover:text-orange-600 font-medium transition-colors">{t('nav-home')}</a>
                            <a href="#about" className="text-gray-600 hover:text-orange-600 font-medium transition-colors">{t('nav-about')}</a>
                            <a href="#services" className="text-gray-600 hover:text-orange-600 font-medium transition-colors">{t('nav-services')}</a>
                            <a href="#contact" className="text-gray-600 hover:text-orange-600 font-medium transition-colors">{t('nav-quote')}</a>
                            
                            {/* Language Selector */}
                            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                                <button onClick={() => changeLanguage('en')} className={`px-2 py-1 text-xs rounded transition-all ${lang === 'en' ? 'bg-white shadow text-orange-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}>EN</button>
                                <button onClick={() => changeLanguage('mr')} className={`px-2 py-1 text-xs rounded transition-all ${lang === 'mr' ? 'bg-white shadow text-orange-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}>मराठी</button>
                            </div>
                            <button onClick={handleLoginClick} className="px-4 py-2 text-orange-600 border border-orange-200 font-medium rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-all flex items-center gap-2">
                                <i className="fa-solid fa-user-shield"></i> <span>{t('nav-login')}</span>
                            </button>
                            <a href="#contact" className="px-5 py-2.5 bg-orange-600 text-white font-medium rounded-lg shadow-md hover:bg-orange-700 transition-all transform hover:-translate-y-0.5">{t('nav-quote')}</a>
                        </div>
                        <div className="md:hidden flex items-center">
                            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-600 hover:text-orange-600 focus:outline-none">
                                <i className={`fa-solid ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-2xl`}></i>
                            </button>
                        </div>
                    </div>
                </div>
                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-lg">
                        <div className="px-4 pt-2 pb-6 space-y-2">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50 mb-2">
                                <span className="text-sm font-semibold text-gray-500">Language / भाषा</span>
                                <div className="flex gap-2">
                                    <button onClick={() => changeLanguage('en')} className={`px-2 py-1 text-sm rounded ${lang === 'en' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>EN</button>
                                    <button onClick={() => changeLanguage('mr')} className={`px-2 py-1 text-sm rounded ${lang === 'mr' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>मराठी</button>
                                </div>
                            </div>
                            <a href="#home" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-md font-medium">{t('nav-home')}</a>
                            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-md font-medium">{t('nav-about')}</a>
                            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-md font-medium">{t('nav-services')}</a>
                            <button onClick={handleLoginClick} className="w-full text-left px-3 py-3 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-md font-medium flex items-center gap-2">
                                <i className="fa-solid fa-user-shield"></i> <span>{t('nav-login')}</span>
                            </button>
                            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-orange-600 font-bold">{t('nav-quote')}</a>
                        </div>
                    </div>
                )}
            </nav>
            {/* Hero Section */}
            <section id="home" className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img src="https://images.unsplash.com/photo-1541600383005-565c949cf777?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" alt="Poultry Farm" className="w-full h-full object-cover opacity-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-white/80 to-transparent"></div>
                </div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
                        <div className="lg:col-span-6 text-center lg:text-left">
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm font-semibold mb-6">
                                <span className="w-2 h-2 rounded-full bg-orange-600 mr-2 animate-pulse"></span>
                                <span>{t('hero-badge')}</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                                <span>{t('hero-title-1')}</span> <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">{t('hero-title-2')}</span>
                            </h1>
                            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                                {t('hero-desc')}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <a href="#contact" className="px-8 py-3.5 bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:bg-orange-700 hover:shadow-orange-500/30 transition-all transform hover:-translate-y-1">
                                    {t('hero-btn-order')}
                                </a>
                                <a href="#services" className="px-8 py-3.5 bg-white text-gray-700 border border-gray-200 font-semibold rounded-lg shadow-sm hover:bg-gray-50 hover:border-orange-200 transition-all">
                                    {t('hero-btn-breeds')}
                                </a>
                            </div>
                            <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-gray-500 text-sm font-medium">
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-check-circle text-green-500"></i> ISO Certified
                                </div>
                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-check-circle text-green-500"></i> Daily Fresh Stock
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-6 mt-12 lg:mt-0 relative">
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white transform rotate-1 hover:rotate-0 transition-transform duration-500">
                                <img src="https://images.unsplash.com/photo-1545468800-85cc9bc6ecf7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Healthy Broiler Chicken" className="w-full h-auto" />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
                                    <p className="font-bold text-lg">Healthy & Hygienic</p>
                                    <p className="text-sm opacity-90">Rural Solapur Farm Standards</p>
                                </div>
                            </div>
                            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100 hidden md:block">
                                <div className="flex items-center gap-3">
                                    <div className="bg-green-100 p-2 rounded-lg text-green-600">
                                        <i className="fa-solid fa-truck-fast text-xl"></i>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Delivery</p>
                                        <p className="font-bold text-gray-900">Fast & Safe</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* Partners Section */}
            <section id="partners" className="py-10 bg-white border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-gray-500 text-sm font-semibold uppercase tracking-wider mb-6">{t('partners-title')}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-feather text-red-500"></i> Suguna Foods
                        </div>
                        <div className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-leaf text-green-600"></i> Baramati Agro
                        </div>
                        <div className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-drumstick-bite text-orange-500"></i> Venkys
                        </div>
                        <div className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-wheat-awn text-yellow-500"></i> Premium Chick Feeds
                        </div>
                    </div>
                </div>
            </section>
            {/* About Section */}
            <section id="about" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1">
                            <div className="grid grid-cols-2 gap-4">
                                <img src="https://images.unsplash.com/photo-1627443152062-843818617567?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Chickens" className="rounded-xl shadow-lg w-full h-48 object-cover" />
                                <img src="https://images.unsplash.com/photo-1587593810167-a84920ea0781?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="White Broiler" className="rounded-xl shadow-lg w-full h-48 object-cover mt-8" />
                            </div>
                        </div>
                        <div className="order-1 md:order-2">
                            <h2 className="text-orange-600 font-bold uppercase tracking-wide text-sm mb-2">{t('about-badge')}</h2>
                            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{t('about-title')}</h3>
                            <p className="text-gray-600 mb-6 leading-relaxed">{t('about-p1')}</p>
                            <p className="text-gray-600 mb-8 leading-relaxed">{t('about-p2')}</p>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-2xl font-bold text-gray-900">5+</h4>
                                    <p className="text-gray-500 text-sm">{t('stat-experience')}</p>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-bold text-gray-900">100%</h4>
                                    <p className="text-gray-500 text-sm">{t('stat-quality')}</p>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-bold text-gray-900">24/7</h4>
                                    <p className="text-gray-500 text-sm">{t('stat-supply')}</p>
                                </div>
                                <div>
                                    <h4 className="text-2xl font-bold text-gray-900">Rural</h4>
                                    <p className="text-gray-500 text-sm">{t('stat-network')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* Services Section */}
            <section id="services" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-orange-600 font-bold uppercase tracking-wide text-sm mb-2">{t('services-badge')}</h2>
                        <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('services-title')}</h3>
                        <p className="text-gray-600">{t('services-desc')}</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-xl transition-shadow border border-gray-100 group">
                            <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                <i className="fa-solid fa-crow text-2xl"></i>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">{t('service-1-title')}</h4>
                            <p className="text-gray-600 mb-4">{t('service-1-desc')}</p>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li className="flex items-center"><i className="fa-solid fa-check text-orange-500 mr-2"></i> Cobb 430 & 500</li>
                                <li className="flex items-center"><i className="fa-solid fa-check text-orange-500 mr-2"></i> Ross 308</li>
                                <li className="flex items-center"><i className="fa-solid fa-check text-orange-500 mr-2"></i> Hubbard</li>
                            </ul>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-xl transition-shadow border border-gray-100 group">
                            <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                <i className="fa-solid fa-hand-holding-dollar text-2xl"></i>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">{t('service-2-title')}</h4>
                            <p className="text-gray-600 mb-4">{t('service-2-desc')}</p>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li className="flex items-center"><i className="fa-solid fa-check text-orange-500 mr-2"></i> Fair Pricing</li>
                                <li className="flex items-center"><i className="fa-solid fa-check text-orange-500 mr-2"></i> Bulk Orders</li>
                                <li className="flex items-center"><i className="fa-solid fa-check text-orange-500 mr-2"></i> Consistent Availability</li>
                            </ul>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-xl transition-shadow border border-gray-100 group">
                            <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                <i className="fa-solid fa-truck text-2xl"></i>
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">{t('service-3-title')}</h4>
                            <p className="text-gray-600 mb-4">{t('service-3-desc')}</p>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li className="flex items-center"><i className="fa-solid fa-check text-orange-500 mr-2"></i> Timely Delivery</li>
                                <li className="flex items-center"><i className="fa-solid fa-check text-orange-500 mr-2"></i> Hygienic Crates</li>
                                <li className="flex items-center"><i className="fa-solid fa-check text-orange-500 mr-2"></i> All Solapur District</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
            {/* Why Choose Us */}
            <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-orange-500 font-bold uppercase tracking-wide text-sm mb-2">{t('why-badge')}</h2>
                            <h3 className="text-3xl md:text-4xl font-bold mb-6">{t('why-title')}</h3>
                            <p className="text-gray-300 mb-8 leading-relaxed">{t('why-desc')}</p>
                            
                            <div className="space-y-6">
                                <div className="flex">
                                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-orange-600/20 flex items-center justify-center border border-orange-600/30">
                                        <i className="fa-solid fa-award text-orange-500"></i>
                                    </div>
                                    <div className="ml-4">
                                        <h4 className="text-lg font-bold">{t('why-1-title')}</h4>
                                        <p className="text-gray-400 text-sm">{t('why-1-desc')}</p>
                                    </div>
                                </div>
                                <div className="flex">
                                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-orange-600/20 flex items-center justify-center border border-orange-600/30">
                                        <i className="fa-solid fa-scale-balanced text-orange-500"></i>
                                    </div>
                                    <div className="ml-4">
                                        <h4 className="text-lg font-bold">{t('why-2-title')}</h4>
                                        <p className="text-gray-400 text-sm">{t('why-2-desc')}</p>
                                    </div>
                                </div>
                                <div className="flex">
                                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-orange-600/20 flex items-center justify-center border border-orange-600/30">
                                        <i className="fa-solid fa-handshake text-orange-500"></i>
                                    </div>
                                    <div className="ml-4">
                                        <h4 className="text-lg font-bold">{t('why-3-title')}</h4>
                                        <p className="text-gray-400 text-sm">{t('why-3-desc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <img src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Quality Chicken" className="rounded-2xl shadow-2xl border border-gray-700" />
                            <div className="absolute -bottom-6 -right-6 bg-orange-600 p-6 rounded-xl shadow-xl hidden md:block">
                                <p className="text-3xl font-bold">100%</p>
                                <p className="text-sm opacity-90">Customer Satisfaction</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* Testimonials */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-center text-3xl font-bold text-gray-900 mb-12">{t('testimonials-title')}</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex text-orange-400 mb-4">
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                            </div>
                            <p className="text-gray-600 italic mb-6">"Regular supply of Suguna breed birds. Best supplier in Solapur."</p>
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">RP</div>
                                <div className="ml-3">
                                    <p className="font-bold text-gray-900">Rajesh Patil</p>
                                    <p className="text-xs text-gray-500">Retail Shop Owner, Barshi</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex text-orange-400 mb-4">
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star-half-stroke"></i>
                            </div>
                            <p className="text-gray-600 italic mb-6">"Excellent meat quality, tender and hygienic. Highly professional team."</p>
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">SK</div>
                                <div className="ml-3">
                                    <p className="font-bold text-gray-900">Sameer Kulkarni</p>
                                    <p className="text-xs text-gray-500">Hotel Manager, Solapur City</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex text-orange-400 mb-4">
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                            </div>
                            <p className="text-gray-600 italic mb-6">"Reliable service even in shortage periods. Trustworthy business."</p>
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">AJ</div>
                                <div className="ml-3">
                                    <p className="font-bold text-gray-900">Amit Jadhav</p>
                                    <p className="text-xs text-gray-500">Wholesaler, Pandharpur</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* Contact Section */}
            <section id="contact" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12">
                        <div>
                            <h2 className="text-orange-600 font-bold uppercase tracking-wide text-sm mb-2">{t('contact-badge')}</h2>
                            <h3 className="text-3xl font-bold text-gray-900 mb-6">{t('contact-title')}</h3>
                            <p className="text-gray-600 mb-8">{t('contact-desc')}</p>
                            
                            <div className="space-y-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                                        <i className="fa-solid fa-location-dot"></i>
                                    </div>
                                    <div className="ml-4">
                                        <h4 className="font-bold text-gray-900">Our Location</h4>
                                        <p className="text-gray-600 text-sm">Station Road, Madha,<br/>Dist - Solapur, Maharashtra</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                                        <i className="fa-solid fa-phone"></i>
                                    </div>
                                    <div className="ml-4">
                                        <h4 className="font-bold text-gray-900">Phone Number</h4>
                                        <p className="text-gray-600 text-sm">+91 86050 30099</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                                        <i className="fa-solid fa-envelope"></i>
                                    </div>
                                    <div className="ml-4">
                                        <h4 className="font-bold text-gray-900">Email Address</h4>
                                        <p className="text-gray-600 text-sm">sohelchickencentremadha@gmail.com</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                            <form onSubmit={handleFormSubmit}>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" placeholder="John" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                        <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" placeholder="Doe" required />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all" placeholder="+91 XXXXX XXXXX" required />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type of Inquiry</label>
                                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all">
                                        <option>Bulk Order (Retailer)</option>
                                        <option>Hotel Supply</option>
                                        <option>Farmer Contract</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all h-32" placeholder="Tell us about your requirement..."></textarea>
                                </div>
                                <button type="submit" className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg shadow-md hover:bg-orange-700 transition-all">{t('contact-btn')}</button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <i className="fa-solid fa-feather text-orange-600 text-2xl"></i>
                                <span className="font-bold text-xl text-white">SOHEL<span className="text-orange-600">CHICKEN</span></span>
                            </div>
                            <p className="text-sm leading-relaxed max-w-sm mb-6">{t('footer-desc')}</p>
                            <div className="flex space-x-4">
                                <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-orange-600 transition-colors"><i className="fa-brands fa-facebook-f text-sm"></i></a>
                                <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-orange-600 transition-colors"><i className="fa-brands fa-whatsapp text-sm"></i></a>
                                <a href="#" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-orange-600 transition-colors"><i className="fa-brands fa-instagram text-sm"></i></a>
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="text-white font-bold mb-4">{t('footer-links')}</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#home" className="hover:text-orange-500 transition-colors">{t('nav-home')}</a></li>
                                <li><a href="#about" className="hover:text-orange-500 transition-colors">{t('nav-about')}</a></li>
                                <li><a href="#services" className="hover:text-orange-500 transition-colors">{t('nav-services')}</a></li>
                                <li><a href="#contact" className="hover:text-orange-500 transition-colors">{t('nav-quote')}</a></li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="text-white font-bold mb-4">{t('footer-products')}</h4>
                            <ul className="space-y-2 text-sm">
                                <li className="hover:text-orange-500 cursor-pointer">Live Broiler (Cobb)</li>
                                <li className="hover:text-orange-500 cursor-pointer">Live Broiler (Ross)</li>
                                <li className="hover:text-orange-500 cursor-pointer">Live Broiler (Hubbard)</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
                        <p>&copy; 2024 SOHEL CHICKEN CENTRE. All rights reserved.</p>
                        <div className="mt-4 md:mt-0">
                            <button onClick={handleLoginClick} className="hover:text-white mr-4">Operator Login</button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
export default LandingPage;