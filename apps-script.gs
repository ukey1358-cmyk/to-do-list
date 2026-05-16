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

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id', 'text', 'done', 'createdAt', 'completedAt']);
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
  return values.slice(1)
    .map(r => ({
      id: String(r[0] || ''),
      text: String(r[1] || ''),
      done: r[2] === true || String(r[2]).toLowerCase() === 'true',
      createdAt: r[3] === '' || r[3] === null ? null : Number(r[3]),
      completedAt: r[4] === '' || r[4] === null ? null : Number(r[4]),
    }))
    .filter(t => t.id);
}

function writeTasks_(tasks) {
  const sh = getSheet_();
  sh.clearContents();
  sh.appendRow(['id', 'text', 'done', 'createdAt', 'completedAt']);
  if (tasks.length > 0) {
    const rows = tasks.map(t => [
      String(t.id || ''),
      String(t.text || ''),
      !!t.done,
      t.createdAt == null ? '' : Number(t.createdAt),
      t.completedAt == null ? '' : Number(t.completedAt),
    ]);
    sh.getRange(2, 1, rows.length, 5).setValues(rows);
  }
  const now = Date.now();
  setUpdatedAt_(now);
  return now;
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
