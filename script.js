document.addEventListener('DOMContentLoaded', () => {
    const initialTimetable = {
        "星期一": {
            1: "英文文法與閱讀", 2: "物聯網實習/機器人控制實習", 3: "物聯網實習/機器人控制實習",
            4: "物聯網實習/機器人控制實習", 5: "國語文", 6: "體育", 7: "英語文"
        },
        "星期二": {
            1: "初階微積分", 2: "專題實作", 3: "專題實作", 4: "專題實作",
            5: "電腦網路實習/運算思維實習", 6: "電腦網路實習/運算思維實習", 7: "電腦網路實習/運算思維實習"
        },
        "星期三": {
            1: "微處理機進階", 2: "初階微積分", 3: "動態網頁製作實習/物聯網基礎應用實習",
            4: "動態網頁製作實習/物聯網基礎應用實習", 5: "綜合活動", 6: "綜合活動", 7: "班會"
        },
        "星期四": {
            1: "國語文", 2: "電子電路", 3: "電子電路", 4: "初階微積分",
            5: "藝術生活", 6: "英語文", 7: "體育"
        },
        "星期五": {
            1: "微處理機進階", 2: "網路資料庫實習/智慧監控實習", 3: "網路資料庫實習/智慧監控實習",
            4: "網路資料庫實習/智慧監控實習", 5: "國語文法概論", 6: "生涯規劃", 7: "英文文法與閱讀"
        },
        "星期六": {1:"", 2:"", 3:"", 4:"", 5:"", 6:"", 7:""},
        "星期日": {1:"", 2:"", 3:"", 4:"", 5:"", 6:"", 7:""}
    };

    const absenceDataEl = document.getElementById('absenceData');
    const calculateButtonEl = document.getElementById('calculateButton');
    const resultsEl = document.getElementById('results');
    const resultsCardsContainerEl = document.getElementById('resultsCardsContainer');
    const timetableEditorEl = document.getElementById('timetableEditor');
    const totalWeeksInputEl = document.getElementById('totalWeeks');
    const displayTotalWeeksEl = document.getElementById('displayTotalWeeks');

    const VALID_ABSENCE_TYPES = ["事", "曠"];
    const PERIODS_PER_DAY = 7;

    function populateTimetableEditor(timetable) {
        timetableEditorEl.innerHTML = '';
        const days = ["星期一", "星期二", "星期三", "星期四", "星期五"];
        days.forEach(day => {
            const currentDaySchedule = timetable[day] || {};
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day-column');
            dayDiv.innerHTML = `<h3>${day}</h3>`;
            for (let i = 1; i <= PERIODS_PER_DAY; i++) {
                const inputId = `tt-${day}-${i}`;
                const courseName = currentDaySchedule[i] || "";
                dayDiv.innerHTML += `
                    <label for="${inputId}">第 ${i} 節:</label>
                    <input type="text" id="${inputId}" data-day="${day}" data-period="${i}" value="${courseName}">
                `;
            }
            timetableEditorEl.appendChild(dayDiv);
        });
    }

    function getCurrentTimetable() {
        const currentTimetable = {};
        const inputs = timetableEditorEl.querySelectorAll('input[type="text"]');
        inputs.forEach(input => {
            const day = input.dataset.day;
            const period = parseInt(input.dataset.period);
            if (!currentTimetable[day]) {
                currentTimetable[day] = {};
            }
            currentTimetable[day][period] = input.value.trim();
        });
        return currentTimetable;
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
                    for (let i = 0; i < 9; i++) {
                        dailyAbsences.push(parts[6 + i] ? parts[6 + i].trim() : "");
                    }
                    records.push({
                        date: dateObj,
                        absences: dailyAbsences
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

        const currentTimetable = getCurrentTimetable();
        const parsedRecords = parseAbsenceRecords(absenceText);
        const totalWeeks = parseInt(totalWeeksInputEl.value, 10);

        if (isNaN(totalWeeks) || totalWeeks <= 0) {
            alert("請輸入有效的學期總週數！");
            return;
        }
        if (displayTotalWeeksEl) {
            // This element is gone from index.html, but we might re-add it or similar later.
            // For now, let's check if it exists before trying to set its textContent.
             // displayTotalWeeksEl.textContent = totalWeeks;
        }

        const totalSessionsByCourse = calculateTotalCourseSessions(currentTimetable, totalWeeks);
        
        // Calculate weekly sessions for each course from the current timetable
        const weeklySessionsByCourse = {};
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
                record.absences.forEach((absenceType, periodIndex) => {
                    if (VALID_ABSENCE_TYPES.includes(absenceType)) {
                        const courseName = currentTimetable[dayOfWeek][periodIndex + 1];
                        if (courseName && courseName.trim() !== "") {
                            absenceCountsByCourse[courseName] = (absenceCountsByCourse[courseName] || 0) + 1;
                            coursesWithAbsences.add(courseName);
                        }
                    }
                });
            }
        });

        // resultsTableBodyEl.innerHTML = ''; // 移除
        resultsCardsContainerEl.innerHTML = ''; // 新增

        const coursesToDisplay = new Set();
        Object.keys(totalSessionsByCourse).forEach(course => {
            if(totalSessionsByCourse[course] > 0) coursesToDisplay.add(course);
        });
        coursesWithAbsences.forEach(course => coursesToDisplay.add(course));

        if (coursesToDisplay.size === 0) {
             resultsEl.style.display = 'block';
             // resultsTableBodyEl.innerHTML = '<tr><td colspan="6">課表中未定義任何有效課程，或無有效缺曠資料。</td></tr>'; // 移除
             resultsCardsContainerEl.innerHTML = '<p class="no-results">課表中未定義任何有效課程，或無有效缺曠資料。</p>'; // 新增
             return;
        }

        const sortedCourses = Array.from(coursesToDisplay).sort();

        sortedCourses.forEach(courseName => {
            const totalSessions = totalSessionsByCourse[courseName] || 0;
            const absentCount = absenceCountsByCourse[courseName] || 0;

            let oneThirdThreshold = 0;
            let sessionsToReachThreshold = 0; // Initialize as number
            let statusText = "";
            let statusClass = ""; // For styling the badge and card
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
                    statusText = "已超過";
                    statusClass = "exceeded";
                    if (absentCount === oneThirdThreshold) {
                        summaryText = `已達 1/3 上限。`;
                    } else {
                        summaryText = `已超過 1/3 上限 ${absentCount - oneThirdThreshold} 次缺席。`; 
                        // User had +1 here, let's verify. If threshold is 10, absent 11, 11-10=1. "已超過1次" seems correct.
                        // Original user code in a previous turn: summaryText = `已超過 1/3 上限 ${absentCount - oneThirdThreshold +1} 次缺席。`;
                        // Let's use the user's latest accepted version:
                        // From user change: summaryText = `已超過 1/3 上限。 ${absentCount - oneThirdThreshold +1} 次缺席。`;
                        // The logic `absentCount - oneThirdThreshold` seems more direct for "times over".
                        // If threshold = 10, absent = 11, then 11-10 = 1. "Exceeded by 1".
                        // If `absentCount - oneThirdThreshold + 1` means `(11-10)+1 = 2`. This seems like "2nd session into exceeded state"
                        // Let's stick to the user's latest summaryText from the diff:
                        summaryText = `已超過 1/3 上限。超過 ${absentCount - oneThirdThreshold + 1} 次缺席。`;
                         if (absentCount === oneThirdThreshold) { // This condition will be met by the parent if, so it might make the above complex.
                             summaryText = `已達 1/3 上限。`;
                         }


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
            } else {
                return; 
            }

            const card = document.createElement('div');
            card.classList.add('result-card', statusClass);
            
            let remainingAbsencesClass = '';
            if (sessionsToReachThreshold < 0) remainingAbsencesClass = 'negative';
            else if (sessionsToReachThreshold > 0 && statusClass === 'safe') remainingAbsencesClass = 'positive';


            card.innerHTML = `
                <div class="card-header">
                    <h3 class="course-name">${courseName}</h3>
                    <span class="status-badge ${statusClass}">${statusText}</span>
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
             // resultsTableBodyEl.innerHTML = '<tr><td colspan="6">沒有可顯示的課程資料。請確認課表包含有效課程且有對應的缺曠記錄。</td></tr>'; // 移除
             resultsCardsContainerEl.innerHTML = '<p class="no-results">沒有可顯示的課程資料。請確認課表包含有效課程且有對應的缺曠記錄。</p>'; // 新增
        }
    });

    populateTimetableEditor(initialTimetable);

    if (totalWeeksInputEl && displayTotalWeeksEl) {
        totalWeeksInputEl.addEventListener('input', () => {
            const newTotalWeeks = parseInt(totalWeeksInputEl.value, 10);
            if (!isNaN(newTotalWeeks) && newTotalWeeks > 0) {
                displayTotalWeeksEl.textContent = newTotalWeeks;
            } else {
                displayTotalWeeksEl.textContent = "-"; // 或者一個預設的無效提示
            }
        });
    }
}); 