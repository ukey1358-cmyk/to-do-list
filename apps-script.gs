/**
 * Google Apps Script backend for the To-Do list app.
 *
 * Setup (한 번만):
 *   1. https://sheets.google.com 에서 새 스프레드시트 생성
 *   2. 확장 프로그램 → Apps Script 메뉴 클릭
 *   3. Code.gs 의 내용을 모두 지우고 이 파일 전체를 붙여넣기
 *   4. 아래 SHARED_TOKEN 값을 본인만의 임의 문자열로 변경
 *      (index.html 의 SYNC_TOKEN 과 반드시 동일하게 맞춤)
 *   5. 저장(💾) → 배포 → 새 배포 →
 *        유형: 웹 앱
 *        다음 사용자로 실행: 나
 *        액세스 권한이 있는 사용자: 모든 사용자
 *      → 배포 → 권한 검토/허용
 *   6. 발급된 "웹 앱 URL" (.../exec 로 끝나는 URL) 을 복사해 index.html 의
 *      SYNC_URL 에 붙여넣기
 *
 * 코드를 수정한 뒤에는 "배포 관리 → 편집(연필) → 새 버전" 으로 재배포해야
 * 변경사항이 반영됩니다.
 */

const SHARED_TOKEN = 'a0qm2pWec_u4WZNNmChbnEfaGDzjgD01';
const SHEET_NAME = 'tasks';
const HISTORY_SHEET_NAME = '완료기록';
const TIMEZONE = 'Asia/Seoul';
const PRIORITIES = ['A', 'B', 'C', 'D'];
const CATEGORIES = ['work', 'home'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id', 'text', 'done', 'priority', 'category', 'createdAt', 'completedAt']);
  }
  return sh;
}

function getHistorySheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HISTORY_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(HISTORY_SHEET_NAME);
    sh.appendRow(['날짜', '중요도', '할 일', '완료 시각', 'id']);
  }
  return sh;
}

function getUpdatedAt_() {
  const v = PropertiesService.getDocumentProperties().getProperty('updatedAt');
  return v ? Number(v) : 0;
}
function setUpdatedAt_(value) {
  PropertiesService.getDocumentProperties().setProperty('updatedAt', String(value));
}

function readTasks_() {
  const sh = getSheet_();
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  // 헤더 기준으로 열을 찾아 이전 스키마(priority 없음)의 데이터도 안전하게 읽음
  const header = values[0].map(String);
  const col = name => header.indexOf(name);
  const iId = col('id'), iText = col('text'), iDone = col('done');
  const iPr = col('priority'), iCat = col('category'), iCr = col('createdAt'), iCo = col('completedAt');
  const num = v => (v === '' || v === null || v === undefined) ? null : Number(v);
  return values.slice(1)
    .map(r => ({
      id: iId < 0 ? '' : String(r[iId] || ''),
      text: iText < 0 ? '' : String(r[iText] || ''),
      done: iDone >= 0 && (r[iDone] === true || String(r[iDone]).toLowerCase() === 'true'),
      priority: iPr >= 0 && PRIORITIES.indexOf(String(r[iPr])) >= 0 ? String(r[iPr]) : 'B',
      category: iCat >= 0 && CATEGORIES.indexOf(String(r[iCat])) >= 0 ? String(r[iCat]) : 'work',
      createdAt: iCr < 0 ? null : num(r[iCr]),
      completedAt: iCo < 0 ? null : num(r[iCo]),
    }))
    .filter(t => t.id);
}

function writeTasks_(tasks) {
  const sh = getSheet_();
  sh.clearContents();
  sh.appendRow(['id', 'text', 'done', 'priority', 'category', 'createdAt', 'completedAt']);
  if (tasks.length > 0) {
    const rows = tasks.map(t => [
      String(t.id || ''),
      String(t.text || ''),
      !!t.done,
      PRIORITIES.indexOf(String(t.priority)) >= 0 ? String(t.priority) : 'B',
      CATEGORIES.indexOf(String(t.category)) >= 0 ? String(t.category) : 'work',
      t.createdAt == null ? '' : Number(t.createdAt),
      t.completedAt == null ? '' : Number(t.completedAt),
    ]);
    sh.getRange(2, 1, rows.length, 7).setValues(rows);
  }
  syncHistory_(tasks);
  const now = Date.now();
  setUpdatedAt_(now);
  return now;
}

/**
 * 완료기록 시트: 완료된 할 일을 날짜별로 누적 저장.
 *  - 완료된 항목은 id 기준으로 한 줄씩 기록 (중복 방지)
 *  - 완료를 취소하면 해당 기록 삭제
 *  - 목록에서 지워진 항목("완료한 일 비우기" 포함)의 기록은 영구 보존
 */
function syncHistory_(tasks) {
  const sh = getHistorySheet_();
  const values = sh.getDataRange().getValues();
  const idToRow = {};
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][4] || '');
    if (id) idToRow[id] = i + 1;
  }

  const currentIds = {};
  const doneIds = {};
  const newRows = [];
  tasks.forEach(function (t) {
    if (!t.id) return;
    currentIds[t.id] = true;
    if (t.done && t.completedAt) {
      doneIds[t.id] = true;
      const d = new Date(Number(t.completedAt));
      const row = [
        Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd'),
        PRIORITIES.indexOf(String(t.priority)) >= 0 ? String(t.priority) : 'B',
        String(t.text || ''),
        Utilities.formatDate(d, TIMEZONE, 'HH:mm'),
        String(t.id),
      ];
      if (idToRow[t.id]) sh.getRange(idToRow[t.id], 1, 1, 5).setValues([row]);
      else newRows.push(row);
    }
  });

  // 완료 취소된 항목의 기록 제거 (아래에서 위로 지워야 행 번호가 안 밀림)
  for (let i = values.length - 1; i >= 1; i--) {
    const id = String(values[i][4] || '');
    if (id && currentIds[id] && !doneIds[id]) sh.deleteRow(i + 1);
  }

  if (newRows.length > 0) {
    sh.getRange(sh.getLastRow() + 1, 1, newRows.length, 5).setValues(newRows);
  }
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const token = (e && e.parameter && e.parameter.token) || '';
  if (token !== SHARED_TOKEN) return jsonOut_({ ok: false, error: 'unauthorized' });
  return jsonOut_({
    ok: true,
    tasks: readTasks_(),
    updatedAt: getUpdatedAt_(),
  });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.token !== SHARED_TOKEN) return jsonOut_({ ok: false, error: 'unauthorized' });
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];
    const updatedAt = writeTasks_(tasks);
    return jsonOut_({ ok: true, updatedAt });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}
