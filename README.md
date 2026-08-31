# Filacalc – Filament Manager & Cost Calculator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Filacalc is a lightweight web application to **manage your 3D printing filaments** and **calculate print costs** based on material consumption.  
It runs on a simple PHP + JSON backend (no database setup required) and works in any standard web server (Apache, Nginx, etc.).

---

## ✨ Upcoming Features
- Language translations ✓ (Fix switch at reload)
- Different currencies ✓

## ✨ Features
- **Filament Manager**
  - Add, edit, and delete filaments  
  - Store brand, type, color, and price per 1 kg spool  
  - Data stored in `data/filaments.json` (easy backup & share)

- **Cost Calculator**
  - Select multiple filaments and input the required grams  
  - Automatic calculation of total costs  
  - Detailed breakdown per filament  

- **UI**
  - Clean, responsive design (HTML, CSS, JS)  
  - Modal for quick filament management  
  - Works in both dark and light mode (with custom favicon/logo)

---

## 🚀 Installation
1. Clone or download the repository:

        git clone https://github.com/yourusername/spoolcalc.git
        cd spoolcalc

2. Make sure you have PHP 8+ installed.  
3. Ensure the `data/` folder is writable by the web server:

        mkdir -p data
        chmod -R 775 data

4. Deploy on your preferred web server (Apache, Nginx, or PHP built-in server):

        php -S localhost:8080

5. Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🖼️ Screenshots

[<img src="https://github.com/user-attachments/assets/00624eec-53f7-4489-a270-0016ee214148" width="500"/>](https://github.com/user-attachments/assets/00624eec-53f7-4489-a270-0016ee214148)
[<img src="https://github.com/user-attachments/assets/ba051b16-05a6-4761-a285-8c3fc3608cde" width="500"/>](https://github.com/user-attachments/assets/ba051b16-05a6-4761-a285-8c3fc3608cde)

---

## 🛠️ Tech Stack
- **Frontend:** HTML, CSS, Vanilla JS  
- **Backend:** PHP 8+, JSON storage (no SQL needed)  
- **Compatibility:** Works on any standard PHP-enabled web server

---

## 📦 Project Structure
    .
    ├── index.php        # Frontend UI
    ├── api.php          # REST API (JSON storage)
    ├── app.js           # Frontend logic
    ├── styles.css       # Styling
    ├── data/            # Filament database (JSON)
    └── favicon.ico      # Filament spool logo

---

## 🤝 Contributing
Contributions are welcome!  
- Fork the repository  
- Create a feature branch (`git checkout -b feature/my-feature`)  
- Commit your changes (`git commit -m "Add my feature"`)  
- Push to your fork and open a Pull Request  

---

## 📜 License
This project is licensed under the [MIT License](LICENSE).  
You are free to use, modify, and distribute it, **as long as credits are preserved**.

---

## 👤 Author
Developed by **Raphael Jäger (Rufi)**  
[Website](https://www.jaeger-raphael.de) · [GitHub](https://github.com/EasyArt)
