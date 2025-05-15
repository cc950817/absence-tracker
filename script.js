document.addEventListener('DOMContentLoaded', () => {
    // 舊的 initialTimetable 可以保留，或者如果 Markdown 是唯一來源，則不需要了。
    // 為清晰起見，暫時註解掉，如果後續解析邏輯需要一個空的初始結構，可以再啟用。
    /*
    const initialTimetable = {
        "星期一": {}, "星期二": {}, "星期三": {}, "星期四": {}, "星期五": {},
        "星期六": {}, "星期日": {} // 包含週末以匹配舊結構，但通常不使用
    };
    */

    const defaultMarkdownTimetable = `### **星期一**

- 第1節：英文文法與閱讀
- 第2節：物聯網實習/機器人控制實習
- 第3節：物聯網實習/機器人控制實習
- 第4節：物聯網實習/機器人控制實習
- 第5節：國語文
- 第6節：體育
- 第7節：英語文

### **星期二**

- 第1節：初階微積分
- 第2節：專題實作
- 第3節：專題實作
- 第4節：專題實作
- 第5節：電腦網路實習/運算思維實習
- 第6節：電腦網路實習/運算思維實習
- 第7節：電腦網路實習/運算思維實習

### **星期三**

- 第1節：微處理機進階
- 第2節：初階微積分
- 第3節：動態網頁製作實習/物聯網基礎應用實習
- 第4節：動態網頁製作實習/物聯網基礎應用實習
- 第5節：綜合活動
- 第6節：綜合活動
- 第7節：班會

### **星期四**

- 第1節：國語文
- 第2節：電子電路
- 第3節：電子電路
- 第4節：初階微積分
- 第5節：藝術生活
- 第6節：英語文
- 第7節：體育

### **星期五**

- 第1節：微處理機進階
- 第2節：網路資料庫實習/智慧監控實習
- 第3節：網路資料庫實習/智慧監控實習
- 第4節：網路資料庫實習/智慧監控實習
- 第5節：國語文法概論
- 第6節：生涯規劃
- 第7節：英文文法與閱讀`;

    const absenceDataEl = document.getElementById('absenceData');
    const calculateButtonEl = document.getElementById('calculateButton');
    const resultsEl = document.getElementById('results');
    const resultsCardsContainerEl = document.getElementById('resultsCardsContainer');
    
    // 新的元素參照
    const markdownTimetableEl = document.getElementById('markdownTimetable');
    const clearTimetableButtonEl = document.getElementById('clearTimetableButton');

    const totalWeeksInputEl = document.getElementById('totalWeeks');
    // const displayTotalWeeksEl = document.getElementById('displayTotalWeeks'); // This was in index.html's table header, which is removed.

    const VALID_ABSENCE_TYPES = ["事", "曠"];
    const PERIODS_PER_DAY = 7; // 雖然 Markdown 更靈活，但保留此常數可能對解析或驗證有用

    // 設定預設 Markdown 課表
    if (markdownTimetableEl) {
        markdownTimetableEl.value = defaultMarkdownTimetable;
    }

    // 清除課表按鈕事件
    if (clearTimetableButtonEl && markdownTimetableEl) {
        clearTimetableButtonEl.addEventListener('click', () => {
            markdownTimetableEl.value = '';
        });
    }

    function parseMarkdownTimetable(markdownText) {
        const timetable = {
            "星期一": {}, "星期二": {}, "星期三": {}, "星期四": {}, "星期五": {}
            // 不包含週末，因為通常課表只到週五
        };
        if (!markdownText || typeof markdownText !== 'string') {
            return timetable; // 返回空課表結構
        }

        const lines = markdownText.split('\n');
        let currentDay = null;
        const dayRegex = /^### \*\*(星期[一二三四五])\*\*/;
        const courseRegex = /^- 第(\d)節：(.+)/;

        for (const line of lines) {
            const trimmedLine = line.trim();
            const dayMatch = trimmedLine.match(dayRegex);
            if (dayMatch) {
                currentDay = dayMatch[1];
                if (!timetable[currentDay]) { // 以防萬一 Markdown 寫錯星期
                    timetable[currentDay] = {};
                }
                continue;
            }

            if (currentDay) {
                const courseMatch = trimmedLine.match(courseRegex);
                if (courseMatch) {
                    const period = parseInt(courseMatch[1], 10);
                    const courseName = courseMatch[2].trim();
                    if (period >= 1 && period <= PERIODS_PER_DAY) { // 假設每日最多7節
                        timetable[currentDay][period] = courseName;
                    }
                }
            }
        }
        return timetable;
    }

    function rocToGregorianDate(rocDateStr) {
        if (!rocDateStr || !/^\d{2,3}\/\d{1,2}\/\d{1,2}$/.test(rocDateStr)) return null;
        const parts = rocDateStr.split('/');
        const year = parseInt(parts[0]) + 1911;
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        return new Date(year, month, day);
    }

    function getDayOfWeekChinese(dateObj) {
        if (!dateObj) return null;
        const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
        return days[dateObj.getDay()];
    }

    function parseAbsenceRecords(textData) {
        const records = [];
        const lines = textData.split('\n')
                              .map(line => line.trim())
                              .filter(line => line !== "");
        let dataStarted = false;
        for (const line of lines) {
            const parts = line.split('\t');
            if (!dataStarted && parts.length >= 15 && /^\d{2,3}\/\d{1,2}\/\d{1,2}$/.test(parts[3].trim())) {
                dataStarted = true;
            }
            if (!dataStarted) continue;

            if (parts.length >= 15) {
                const dateStr = parts[3].trim();
                const dateObj = rocToGregorianDate(dateStr);
                if (dateObj) {
                    const dailyAbsences = [];
                    // 假設銷假紀錄中最多有9節課的記錄 (parts[6] 到 parts[14])
                    // 但我們的課表通常是7節，這裡取用課表定義的 PERIODS_PER_DAY
                    for (let i = 0; i < PERIODS_PER_DAY; i++) { // 修改此處，原為9
                        dailyAbsences.push(parts[6 + i] ? parts[6 + i].trim() : "");
                    }
                    records.push({
                        date: dateObj,
                        absences: dailyAbsences // 這應該是每日的缺曠狀態陣列，例如 ["", "事", "", "曠", ...]
                    });
                }
            }
        }
        return records;
    }

    function calculateTotalCourseSessions(timetable, weeks) {
        const courseSessions = {};
        Object.values(timetable).forEach(daySchedule => {
            Object.values(daySchedule).forEach(courseName => {
                if (courseName && courseName.trim() !== "") {
                    courseSessions[courseName] = (courseSessions[courseName] || 0) + 1;
                }
            });
        });
        Object.keys(courseSessions).forEach(courseName => {
            courseSessions[courseName] *= weeks;
        });
        return courseSessions;
    }

    calculateButtonEl.addEventListener('click', () => {
        const absenceText = absenceDataEl.value;
        if (!absenceText.trim()) {
            alert("請貼上缺曠資料！");
            return;
        }
        
        const markdownTimetableText = markdownTimetableEl.value;
        if (!markdownTimetableText.trim()) {
            alert("請輸入課表內容！");
            return;
        }
        const currentTimetable = parseMarkdownTimetable(markdownTimetableText);

        // 檢查解析後的課表是否為空或無效
        let hasValidCoursesInTimetable = false;
        Object.values(currentTimetable).forEach(daySchedule => {
            if (Object.keys(daySchedule).length > 0) {
                hasValidCoursesInTimetable = true;
            }
        });
        if (!hasValidCoursesInTimetable) {
            alert("課表格式有誤或未包含任何課程，請依照範例格式輸入。");
            return;
        }

        const parsedRecords = parseAbsenceRecords(absenceText);
        const totalWeeks = parseInt(totalWeeksInputEl.value, 10);

        if (isNaN(totalWeeks) || totalWeeks <= 0) {
            alert("請輸入有效的學期總週數！");
            return;
        }
        
        const totalSessionsByCourse = calculateTotalCourseSessions(currentTimetable, totalWeeks);
        
        const weeklySessionsByCourse = {}; // 重新從 currentTimetable 計算
        Object.keys(currentTimetable).forEach(day => {
            Object.values(currentTimetable[day]).forEach(courseName => {
                if (courseName && courseName.trim() !== "") {
                    weeklySessionsByCourse[courseName] = (weeklySessionsByCourse[courseName] || 0) + 1;
                }
            });
        });

        const absenceCountsByCourse = {};
        const coursesWithAbsences = new Set();

        parsedRecords.forEach(record => {
            const dayOfWeek = getDayOfWeekChinese(record.date);
            if (dayOfWeek && currentTimetable[dayOfWeek]) {
                record.absences.forEach((absenceType, periodIndex) => { // periodIndex is 0-based
                    if (VALID_ABSENCE_TYPES.includes(absenceType)) {
                        const courseName = currentTimetable[dayOfWeek][periodIndex + 1]; // Timetable periods are 1-based
                        if (courseName && courseName.trim() !== "") {
                            absenceCountsByCourse[courseName] = (absenceCountsByCourse[courseName] || 0) + 1;
                            coursesWithAbsences.add(courseName);
                        }
                    }
                });
            }
        });

        resultsCardsContainerEl.innerHTML = ''; 

        const coursesToDisplay = new Set();
        Object.keys(totalSessionsByCourse).forEach(course => {
            if(totalSessionsByCourse[course] > 0) coursesToDisplay.add(course);
        });
        coursesWithAbsences.forEach(course => coursesToDisplay.add(course));

        if (coursesToDisplay.size === 0) {
             resultsEl.style.display = 'block';
             resultsCardsContainerEl.innerHTML = '<p class="no-results">課表中未定義任何有效課程，或無有效缺曠資料。請檢查課表與缺曠記錄。</p>';
             return;
        }

        const sortedCourses = Array.from(coursesToDisplay).sort();

        sortedCourses.forEach(courseName => {
            const totalSessions = totalSessionsByCourse[courseName] || 0;
            const absentCount = absenceCountsByCourse[courseName] || 0;

            let oneThirdThreshold = 0;
            let sessionsToReachThreshold = 0; 
            let statusText = "";
            let statusClass = ""; 
            let summaryText = "";
            
            const sessionsThisCoursePerWeek = weeklySessionsByCourse[courseName] || 0;

            if (totalSessions <= 0 && absentCount > 0) { 
                statusText = "錯誤";
                statusClass = "error"; 
                summaryText = "課程總節數為0或未在課表，但有缺曠紀錄。";
                sessionsToReachThreshold = -absentCount; 
                oneThirdThreshold = 0; 
            } else if (totalSessions > 0) {
                oneThirdThreshold = Math.ceil(totalSessions / 3);
                sessionsToReachThreshold = oneThirdThreshold - absentCount;
                const isOverOrAtOneThird = absentCount >= oneThirdThreshold;
                
                if (isOverOrAtOneThird) {
                    statusText = "扣考"; 
                    statusClass = "exceeded";
                    if (absentCount === oneThirdThreshold) {
                        summaryText = `已達 1/3 上限。`;
                    } else { // absentCount > oneThirdThreshold
                        const extraAbsences = absentCount - oneThirdThreshold;
                        summaryText = `已超過總節數的1/3，並已額外缺席 ${extraAbsences} 節課。`;
                    }
                } else if (sessionsThisCoursePerWeek > 0 && sessionsToReachThreshold > 0 && sessionsToReachThreshold <= sessionsThisCoursePerWeek) {
                    statusText = "警告";
                    statusClass = "warning";
                    summaryText = `注意！若本科目再缺席 ${sessionsThisCoursePerWeek} 節，將會達到或超過1/3的缺席上限。`;
                } else {
                    statusText = "安全";
                    statusClass = "safe";
                    summaryText = `在達到 1/3 上限之前，您還可以缺席 ${sessionsToReachThreshold} 次。`;
                }
            } else { // totalSessions is 0 and absentCount is 0
                // Don't display courses that are not in the timetable and have no absences.
                // This case might occur if a courseName was in weeklySessionsByCourse (e.g. from an empty slot in markdown)
                // but calculateTotalCourseSessions resulted in 0 total sessions over the semester.
                // Only display if totalSessionsByCourse had it, or if it had absences.
                // The `coursesToDisplay` logic should already handle this.
                // If we reach here, it means it was in `coursesToDisplay` but somehow `totalSessions` is still 0.
                // This implies it might be an empty course in the timetable but without absences.
                // We can explicitly skip it or let the card be minimal. Let's skip.
                if (absentCount === 0) return; // Explicitly skip if no absences and no total sessions.

                // Fallback for safety, though coursesToDisplay should prevent this mostly
                statusText = "未知";
                statusClass = "error"; // Or a new 'unknown' class
                summaryText = "課程資料不完整或未在課表。";
                oneThirdThreshold = 0;
                sessionsToReachThreshold = 0;

            }

            const card = document.createElement('div');
            card.classList.add('result-card', statusClass);
            
            let remainingAbsencesClass = '';
            if (sessionsToReachThreshold < 0) remainingAbsencesClass = 'negative';
            else if (sessionsToReachThreshold > 0 && statusClass === 'safe') remainingAbsencesClass = 'positive';

            let badgeBackgroundColor = '';
            switch (statusClass) {
                case 'safe':
                    badgeBackgroundColor = '#28a745'; // Green
                    break;
                case 'exceeded':
                    badgeBackgroundColor = '#dc3545'; // Red
                    break;
                case 'warning':
                    badgeBackgroundColor = '#ffc107'; // Yellow
                    break;
                case 'error':
                    badgeBackgroundColor = '#fd7e14'; // Orange
                    break;
                default: // For "未知" or other unhandled statusClass
                    badgeBackgroundColor = '#6c757d'; // Grey
                    break;
            }

            card.innerHTML = `
                <div class="card-header">
                    <h3 class="course-name">${courseName}</h3>
                    <span class="status-badge ${statusClass}" style="background-color: ${badgeBackgroundColor} !important;">${statusText}</span>
                </div>
                <p class="summary-text">${summaryText}</p>
                <div class="details">
                    <div class="detail-item"><span class="label">總節數：</span><span class="value">${totalSessions}</span></div>
                    <div class="detail-item"><span class="label">已計算缺席 (事/曠)：</span><span class="value">${absentCount}</span></div>
                    <div class="detail-item"><span class="label">最多允許缺席 (1/3)：</span><span class="value">${oneThirdThreshold > 0 ? oneThirdThreshold : 'N/A'}</span></div>
                    <div class="detail-item"><span class="label">剩餘可缺席次數：</span><span class="value ${remainingAbsencesClass}">${sessionsToReachThreshold}</span></div>
                </div>
            `;
            resultsCardsContainerEl.appendChild(card);
        });

        resultsEl.style.display = 'block';
        if (resultsCardsContainerEl.innerHTML === '') {
             resultsCardsContainerEl.innerHTML = '<p class="no-results">沒有可顯示的課程資料。請確認課表包含有效課程且有對應的缺曠記錄。</p>';
        }
    });

    // 舊的 populateTimetableEditor 呼叫，現在不需要了
    // populateTimetableEditor(initialTimetable); 

    // 舊的 totalWeeksInputEl input 事件監聽器，如果 displayTotalWeeksEl 已被移除，則不需要
    /*
    if (totalWeeksInputEl && displayTotalWeeksEl) { // displayTotalWeeksEl might be null
        totalWeeksInputEl.addEventListener('input', () => {
            const newTotalWeeks = parseInt(totalWeeksInputEl.value, 10);
            if (displayTotalWeeksEl) { // Check again before using
                if (!isNaN(newTotalWeeks) && newTotalWeeks > 0) {
                    displayTotalWeeksEl.textContent = newTotalWeeks;
                } else {
                    displayTotalWeeksEl.textContent = "-"; 
                }
            }
        });
    }
    */
}); 