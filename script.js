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
    const resultsTableBodyEl = document.querySelector('#resultsTable tbody');
    const timetableEditorEl = document.getElementById('timetableEditor');

    const TOTAL_WEEKS = 17;
    const VALID_ABSENCE_TYPES = ["事", "曠"];
    const PERIODS_PER_DAY = 7;

    function populateTimetableEditor(timetable) {
        timetableEditorEl.innerHTML = '';
        const days = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];
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
        const totalSessionsByCourse = calculateTotalCourseSessions(currentTimetable, TOTAL_WEEKS);
        
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

        resultsTableBodyEl.innerHTML = '';
        
        const coursesToDisplay = new Set();
        Object.keys(totalSessionsByCourse).forEach(course => {
            if(totalSessionsByCourse[course] > 0) coursesToDisplay.add(course);
        });
        coursesWithAbsences.forEach(course => coursesToDisplay.add(course));

        if (coursesToDisplay.size === 0) {
             resultsEl.style.display = 'block';
             resultsTableBodyEl.innerHTML = '<tr><td colspan="6">課表中未定義任何有效課程，或無有效缺曠資料。</td></tr>';
             return;
        }

        const sortedCourses = Array.from(coursesToDisplay).sort();

        sortedCourses.forEach(courseName => {
            const totalSessions = totalSessionsByCourse[courseName] || 0;
            const absentCount = absenceCountsByCourse[courseName] || 0;

            let oneThirdThreshold = 0;
            let sessionsToReachThreshold = "N/A";
            let statusText = "";
            let rowClass = "";

            if (totalSessions > 0) {
                oneThirdThreshold = Math.ceil(totalSessions / 3);
                sessionsToReachThreshold = Math.max(0, oneThirdThreshold - absentCount);
                const isOverOrAtOneThird = absentCount >= oneThirdThreshold;
                statusText = isOverOrAtOneThird ? `是 (已達 ${absentCount}/${oneThirdThreshold})` : "否";
                if (isOverOrAtOneThird) {
                    rowClass = 'warning';
                }
            } else if (absentCount > 0) { // Course has absences but not in timetable or 0 total sessions
                statusText = "錯誤：課程總節數為0或未在課表";
                rowClass = 'warning';
                oneThirdThreshold = "N/A";
            } else {
                // Course has 0 total sessions and 0 absences (e.g. an empty slot in timetable editor)
                // These are typically not shown unless they were explicitly in totalSessionsByCourse with 0 sessions.
                // The current logic for `coursesToDisplay` should generally filter these out unless they had absences.
                return; // Skip row for courses with 0 total and 0 absent if they weren't explicitly tracked
            }

            const row = resultsTableBodyEl.insertRow();
            if(rowClass) row.classList.add(rowClass);
            row.insertCell().textContent = courseName;
            row.insertCell().textContent = totalSessions;
            row.insertCell().textContent = absentCount;
            row.insertCell().textContent = totalSessions > 0 ? oneThirdThreshold : "N/A";
            row.insertCell().textContent = sessionsToReachThreshold;
            row.insertCell().textContent = statusText;
        });

        resultsEl.style.display = 'block';
        if (resultsTableBodyEl.innerHTML === '') {
            resultsTableBodyEl.innerHTML = '<tr><td colspan="6">沒有可顯示的課程資料。請確認課表包含有效課程且有對應的缺曠記錄。</td></tr>';
        }
    });

    populateTimetableEditor(initialTimetable);
}); 