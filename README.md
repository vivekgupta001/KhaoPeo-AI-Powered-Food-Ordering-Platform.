# 🍛 KhaoPeo - AI-Powered Food Ordering Platform

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-5.3-blue.svg)](#)
[![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow.svg)](#)

**KhaoPeo** is a full-featured, role-based food ordering platform with AI chatbot (voice-enabled) and smart promo code system. Built with vanilla JavaScript—zero dependencies, production-ready.

---

## ✨ Key Features

✅ **Multi-role system** (Admin, Owner, Customer, Delivery)  
✅ **AI Chatbot** with voice input/output (36+ Q&A)  
✅ **Promo codes** with automatic discount calculation  
✅ **Real-time order tracking**  
✅ **Restaurant menu management**  
✅ **Smart search & filters**  
✅ **Wishlist & reviews**  
✅ **100% responsive** (mobile, tablet, desktop)  
✅ **WCAG 2.1 A accessible**  
✅ **LocalStorage persistence** (no backend needed)  

---

## 🚀 Quick Start (30 seconds)

```bash
# Clone & open
git clone https://github.com/yourusername/KhaoPeo.git
cd KhaoPeo

# Option 1: Direct open
open index.html

# Option 2: Local server
python -m http.server 8000
# Visit http://localhost:8000

# Option 3: VS Code Live Server
# Right-click index.html → Open with Live Server
```

---

## 👥 Demo Accounts (Pre-loaded)

| Role | Username | Password |
|------|----------|----------|
| 👨‍💼 Admin | admin | admin123 |
| 🍽️ Owner 1 | tajbiryani_demo | demo123 |
| 🍽️ Owner 2 | pizzaparadise_demo | demo123 |
| 👥 Customer | customer_demo | demo123 |
| 🏍️ Delivery | delivery_demo | demo123 |

---

## 📁 Project Structure

```
KhaoPeo/
├── index.html              # Main HTML
├── script.js               # Core app (4,911 lines)
├── styles.css              # Complete styling
├── README.md               # This file
├── CONTRIBUTING.md         # Contribution guide
├── LICENSE                 # MIT License
└── .gitignore              # Git configuration
```

---

## 👥 User Roles

### 👨‍💼 Admin
- Platform statistics
- Approve/reject restaurants
- Manage users & orders

### 🍽️ Restaurant Owner
- Menu management
- Create/edit promo codes
- View & manage orders
- Track earnings

### 👥 Customer
- Browse restaurants
- Search & filter
- Apply promo codes (one-click)
- Track orders
- Leave reviews

### 🏍️ Delivery Partner
- Accept/decline deliveries
- Real-time GPS tracking
- Track earnings

---

## 🎟️ Promo Code System

**Features:**
- 6 pre-loaded demo codes (2 per restaurant)
- Percentage & fixed amount discounts
- Minimum order validation
- Maximum cap enforcement
- One-click application
- Owner CRUD operations

**Sample Codes:**
- `BIRYANI50` - 50% off (min ₹300)
- `PIZZA30` - 30% off (min ₹400)
- `SAVE100` - ₹100 fixed discount

---

## 🤖 AI Chatbot

**Features:**
- 36+ Q&A pairs (role-specific)
- Voice input 🎤 (say questions)
- Voice output 🔊 (hear answers)
- 5-tier smart matching
- Available on all pages
- 3 smart suggestions
- Mute controls

---

## 🔧 Tech Stack

```
Frontend:      Vanilla JavaScript (ES6+), HTML5, CSS3
Storage:       Browser LocalStorage (5-10MB)
Voice API:     Web Speech API
Dependencies:  ZERO
Browsers:      Chrome, Firefox, Safari, Edge (latest)
Mobile:        100% responsive
Accessibility: WCAG 2.1 A
```

---

## 📊 Stats

```
Lines of Code:    4,911+ (JavaScript)
CSS Rules:        150+ (Responsive)
Knowledge Base:   36+ Q&A pairs
Demo Data:        3 restaurants, 7 items, 6 promo codes
Features:         50+
Browser Support:  4+ modern browsers
Mobile Support:   100%

```
## Important Notes
**Use in Developer Mode (Inspect)**

## Clear all app data except certain things
const keysToKeep = ['demoVersion', 'theme', 'language']; // optional keys to keep

Object.keys(localStorage).forEach(key => {
    if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
    }
});

console.log("KhaoPeo data cleared!");

## For Check the Storage
let total = 0;
for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
    }
}
console.log("LocalStorage used: " + (total / 1024).toFixed(2) + " KB");




---

## 🚀 Deployment

### GitHub Pages
```bash
git push origin main
# Settings → Pages → Main branch → Save
# Live at: https://yourusername.github.io/KhaoPeo
```

### Netlify / Vercel
Connect GitHub repo → auto-deploy on push

---

## 🧪 Testing Checklist

- [ ] Register & login
- [ ] Browse & search restaurants
- [ ] Add items to cart
- [ ] Apply promo codes
- [ ] Place order & track
- [ ] Test chatbot (voice & text)
- [ ] Admin approvals
- [ ] Owner management

---

## 🐛 Troubleshooting

|        Issue           |        Solution                 |
|------------------------|---------------------------------|
| Chatbot not responding | Enable JS, clear cache, refresh |
| Promo not applying | Check spelling, verify min order |
| Voice not working | Grant microphone permission, use HTTPS |
| Data not saving | Enable localStorage, check quota |

---

## 🔐 Security & Privacy

✅ Local storage only (no servers)  
✅ No external API calls  
✅ No tracking  
✅ Input validation  
✅ HTTPS ready  

---

## 📝 Contributing

1. Fork repository
2. Create branch: `git checkout -b feature/name`
3. Commit: `git commit -m 'Add feature'`
4. Push: `git push origin feature/name`
5. Open Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📄 License

MIT License - See [LICENSE](LICENSE)

✅ Commercial use | ✅ Modify | ✅ Distribute  
⚠️ Include license & attribution

---

## 📚 Documentation

- [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) - Full features
- [PROMO_CODES_DISPLAY.md](PROMO_CODES_DISPLAY.md) - Promo system
- [GITHUB_GUIDE.md](GITHUB_GUIDE.md) - GitHub guide
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guide

---

## 🔮 Roadmap

- [ ] Backend API (Node.js/Express)
- [ ] Real database (MongoDB)
- [ ] Payment gateway
- [ ] React Native mobile app
- [ ] Push notifications
- [ ] ML recommendations

---

## 📞 Support

- **Email**: support@KhaoPeo.com
- **Issues**: [GitHub Issues](#)
- **Discussions**: [GitHub Discussions](#)

## 👨‍💻 Team

**KhaoPeo Development Team**

|    Role        |               Name                     |     Contribution         |
|----------------|----------------------------------------|--------------------------|
| Lead Developer | Vivek Kumar Gupta |Vinit Kumar Mandal | Full Stack, Promo System |
| Core Developer | Vivek Kumar Gupta | Vinit Kumar Mandal | Features, Testing        |
| UI/UX | Community | Design Feedback |

## 🔗 Social Media

- **LinkedIn**: [Vivek Kumar Gupta](https://www.linkedin.com/in/vivekkumargupta01)
- **LinkedIn**: [Vinit Kumar Mandal](https://www.linkedin.com/in/vinit-kumar-mandal)

---

**Made with ❤️ by KhaoPeo Team**

⭐ **If helpful, please star the repository!**

**Last Updated**: February 2, 2026 | **Version**: 5.3 | **Status**: ✅ Production Ready
