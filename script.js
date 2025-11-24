// script.js (เชื่อมต่อกับ Google Sheets)

document.addEventListener('DOMContentLoaded', () => {
    // *** URL ของ Web App ของคุณถูกใส่ไว้ที่นี่แล้ว ***
    const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxzUCAkTsb7h1L4QHGU0C7A0DAJKe_lo90bBAWE2OsEagoOi8fh1Hd13NLc7lSrBut5qg/exec"; 
    
    let currentDate = new Date();
    currentDate.setDate(1); 

    const monthDisplay = document.getElementById('current-month');
    const scheduleBody = document.getElementById('schedule-body');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const dayNameMap = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

    let savedData = {}; // Global object to hold data fetched from Google Sheet

    // 1. ฟังก์ชันโหลดข้อมูลจาก Google Sheet (เมื่อเปลี่ยนเดือน)
    async function loadDataAndRender(date) {
        try {
            // แสดงสถานะการโหลด
            monthDisplay.textContent = 'กำลังโหลด...'; 
            
            const response = await fetch(WEB_APP_URL); // GET request
            const data = await response.json();
            
            // Map fetched array to a key-value object for easy lookup by dateKey
            savedData = data.reduce((acc, item) => {
                // ตรวจสอบความถูกต้องของข้อมูลก่อนนำมาใช้
                if (item && item.dateKey) {
                    acc[item.dateKey] = item.content;
                }
                return acc;
            }, {});
            
            // Render the schedule with the fetched data
            renderSchedule(date);

        } catch (error) {
            console.error("Error fetching data from Google Sheet:", error);
            monthDisplay.textContent = 'ข้อผิดพลาดในการโหลด';
            alert("ไม่สามารถโหลดข้อมูลจาก Google Sheet ได้ โปรดตรวจสอบ GAS URL และการ Deploy");
            renderSchedule(date); // ยังคงสร้างโครงสร้างตาราง
        }
    }

    // 2. ฟังก์ชันหลักในการสร้างตาราง (ใช้ข้อมูลจาก savedData)
    function renderSchedule(date) {
        scheduleBody.innerHTML = '';
        
        const year = date.getFullYear();
        const month = date.getMonth();
        // กำหนดรูปแบบภาษาไทยให้แสดงผลลัพธ์ที่ถูกต้อง
        const monthName = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(date);
        monthDisplay.textContent = monthName;

        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= lastDayOfMonth; day++) {
            const currentDay = new Date(year, month, day);
            const dayOfWeek = currentDay.getDay(); 
            
            // รูปแบบ YYYY-MM-DD
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayName = dayNameMap[dayOfWeek];

            // ใช้ข้อมูลที่โหลดมา ถ้าไม่มีให้เป็นค่าว่าง
            const contentFromSheet = savedData[dateKey] || ''; 

            const row = document.createElement('tr');
            row.setAttribute('data-date', dateKey);

            if (dayOfWeek === 0 || dayOfWeek === 6) { 
                 row.classList.add('weekend'); 
            }

            const dateCell = document.createElement('td');
            dateCell.classList.add('cell-date');
            dateCell.textContent = `${day} (${dayName})`;
            row.appendChild(dateCell);

            const hostCell = document.createElement('td');
            hostCell.classList.add('cell-host');
            
            const contentDiv = document.createElement('div');
            contentDiv.classList.add('host-content');
            contentDiv.setAttribute('contenteditable', 'true');
            contentDiv.textContent = contentFromSheet;
            
            // เพิ่ม Event Listener สำหรับการบันทึกข้อมูลส่วนกลาง
            contentDiv.addEventListener('blur', saveContent);

            hostCell.appendChild(contentDiv);
            row.appendChild(hostCell);

            scheduleBody.appendChild(row);
        }
    }

    // 3. ฟังก์ชันสำหรับบันทึกข้อมูลไปยัง Google Sheet (POST request)
    async function saveContent(e) {
        const row = e.target.closest('tr');
        const dateKey = row.dataset.date;
        const content = e.target.innerText.trim();
        
        // ดึงชื่อวันในสัปดาห์มาเพื่อส่งไปบันทึกด้วย
        const dateText = row.querySelector('.cell-date').textContent;
        const dayNameMatch = dateText.match(/\((.*?)\)/);
        const dayName = dayNameMatch ? dayNameMatch[1] : '';

        // เตรียมข้อมูลในรูปแบบ JSON
        const postData = {
            dateKey: dateKey,
            content: content,
            dayName: dayName
        };

        try {
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // สำคัญสำหรับ GAS
                },
                body: JSON.stringify(postData)
            });
            
            const result = await response.json();
            if (result.status === 'success') {
                 console.log(`บันทึกสำเร็จ: ${result.action} - ${dateKey}`);
                 // อัปเดตข้อมูลใน savedData เพื่อให้การโหลดครั้งต่อไปใช้ข้อมูลใหม่ทันที
                 savedData[dateKey] = content; 
            } else {
                 console.error("บันทึกไม่สำเร็จ:", result.message);
                 alert(`บันทึกไม่สำเร็จ: ${result.message}`);
            }

        } catch (error) {
            console.error("Error saving data:", error);
            alert("บันทึกข้อมูลไม่สำเร็จ");
        }
    }

    // 4. ฟังก์ชันสำหรับการนำทาง
    function changeMonth(direction) {
        currentDate.setMonth(currentDate.getMonth() + direction);
        loadDataAndRender(currentDate);
    }

    // กำหนด Event Listeners
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    // เริ่มโหลดข้อมูลและแสดงตารางเมื่อโหลดหน้า
    loadDataAndRender(currentDate);
});