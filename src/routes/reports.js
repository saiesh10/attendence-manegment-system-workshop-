const express = require('express');
const ExcelJS = require('exceljs');
const { param, validationResult } = require('express-validator');
const prisma = require('../prisma');
const authenticateTeacher = require('../middleware/auth');

const router = express.Router();

const STATUS_SAFE = 'Safe';
const STATUS_WARNING = 'Warning';
const STATUS_SHORTAGE = 'Shortage';

function getAttendanceStatus(percentage) {
  if (percentage >= 75) return STATUS_SAFE;
  if (percentage >= 50) return STATUS_WARNING;
  return STATUS_SHORTAGE;
}

function getStatusFill(percentage) {
  if (percentage >= 75) {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
  }
  if (percentage >= 50) {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
  }
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
}

function styleHeaderRow(headerRow) {
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
}

function styleSimpleHeaderRow(headerRow) {
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
}

function normalizeSheetName(sheetName, index) {
  const sanitized = sheetName.replace(/[:\\/?*\[\]]/g, '').trim().substring(0, 31);
  return sanitized || `Sheet${index}`;
}

function setAutoColumnWidths(worksheet) {
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value;
      if (cellValue !== null && cellValue !== undefined) {
        const length = cellValue.toString().length;
        if (length > maxLength) {
          maxLength = length;
        }
      }
    });
    column.width = Math.min(Math.max(maxLength + 2, 12), 40);
  });
}

router.use(authenticateTeacher);

router.get('/subject/:subject', [param('subject').trim().notEmpty().withMessage('Subject is required')], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const subject = req.params.subject;

  try {
    const sessions = await prisma.session.findMany({
      where: {
        teacherId: req.teacher.id,
        subject,
      },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { attendance: true } } },
    });

    if (!sessions.length) {
      return res.status(404).json({ error: 'No sessions found for this subject' });
    }

    const sessionIds = sessions.map((session) => session.id);
    const totalSessions = sessionIds.length;

    const attendanceGroups = await prisma.attendance.groupBy({
      by: ['studentRoll', 'studentName'],
      where: { sessionId: { in: sessionIds } },
      _count: { sessionId: true },
    });

    const attendanceRecords = await prisma.attendance.findMany({
      where: { sessionId: { in: sessionIds } },
      include: { session: true },
      orderBy: [{ scannedAt: 'asc' }],
    });

    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet('Attendance Summary');
    summarySheet.addRow(['Roll No', 'Student Name', 'Sessions Attended', 'Total Sessions', 'Percentage', 'Status']);
    styleHeaderRow(summarySheet.getRow(1));

    attendanceGroups.forEach((item) => {
      const attended = item._count.sessionId;
      const percentage = Number(((attended / totalSessions) * 100).toFixed(2));
      const status = getAttendanceStatus(percentage);
      const row = summarySheet.addRow([item.studentRoll, item.studentName || '', attended, totalSessions, percentage, status]);
      row.eachCell((cell) => {
        if (cell._column && cell._column.number > 0) {
          cell.fill = getStatusFill(percentage);
        }
      });
    });

    summarySheet.columns.forEach((column) => {
      column.numFmt = column.header === 'Percentage' ? '0.00' : undefined;
    });

    setAutoColumnWidths(summarySheet);

    const detailSheet = workbook.addWorksheet('Session-wise Detail');
    detailSheet.addRow(['Session Date', 'Subject', 'Section', 'Roll No', 'Student Name', 'Time of Scan']);
    styleSimpleHeaderRow(detailSheet.getRow(1));

    attendanceRecords.forEach((record) => {
      detailSheet.addRow([
        record.session.createdAt.toISOString(),
        record.session.subject,
        record.session.section || '',
        record.studentRoll,
        record.studentName || '',
        record.scannedAt.toISOString(),
      ]);
    });

    setAutoColumnWidths(detailSheet);

    const sessionSheet = workbook.addWorksheet('Session Summary');
    sessionSheet.addRow(['Session ID', 'Subject', 'Section', 'Date', 'Total Present', 'Status']);
    styleSimpleHeaderRow(sessionSheet.getRow(1));

    sessions.forEach((session) => {
      sessionSheet.addRow([
        session.id,
        session.subject,
        session.section || '',
        session.createdAt.toISOString(),
        session._count.attendance,
        session.closed ? 'Closed' : 'Open',
      ]);
    });

    setAutoColumnWidths(sessionSheet);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `attendance_${subject.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
    return null;
  } catch (error) {
    return res.status(500).json({ error: 'Unable to export subject report' });
  }
});

router.get('/export-session/:sessionId', [param('sessionId').isUUID().withMessage('Valid session ID is required')], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.sessionId },
      include: { attendance: { orderBy: { scannedAt: 'asc' } } },
    });

    if (!session || session.teacherId !== req.teacher.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Session Export');

    sheet.addRow(['Subject', session.subject]);
    sheet.addRow(['Section', session.section || '']);
    sheet.addRow(['Date', session.createdAt.toISOString()]);
    sheet.addRow([]);
    sheet.addRow(['Roll No', 'Student Name', 'Time of Scan']);
    styleSimpleHeaderRow(sheet.getRow(5));

    session.attendance.forEach((record) => {
      sheet.addRow([record.studentRoll, record.studentName || '', record.scannedAt.toISOString()]);
    });

    setAutoColumnWidths(sheet);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `session_${session.subject.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
    return null;
  } catch (error) {
    return res.status(500).json({ error: 'Unable to export session report' });
  }
});

router.get('/export-all', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { teacherId: req.teacher.id },
      orderBy: [{ subject: 'asc' }, { createdAt: 'asc' }],
    });

    if (!sessions.length) {
      return res.status(404).json({ error: 'No sessions found for teacher' });
    }

    const workbook = new ExcelJS.Workbook();
    const subjects = [...new Set(sessions.map((session) => session.subject))];
    const sheetNames = new Set();

    for (let i = 0; i < subjects.length; i += 1) {
      const subject = subjects[i];
      const subjectSessions = sessions.filter((session) => session.subject === subject);
      const sessionIds = subjectSessions.map((session) => session.id);
      const totalSessions = sessionIds.length;

      const attendanceGroups = await prisma.attendance.groupBy({
        by: ['studentRoll', 'studentName'],
        where: { sessionId: { in: sessionIds } },
        _count: { sessionId: true },
      });

      let sheetName = normalizeSheetName(subject, i + 1);
      if (sheetNames.has(sheetName)) {
        sheetName = `${sheetName.substring(0, 26)}_${i + 1}`;
      }
      sheetNames.add(sheetName);

      const sheet = workbook.addWorksheet(sheetName);
      sheet.addRow(['Roll No', 'Student Name', 'Sessions Attended', 'Total Sessions', 'Percentage', 'Status']);
      styleHeaderRow(sheet.getRow(1));

      attendanceGroups.forEach((item) => {
        const attended = item._count.sessionId;
        const percentage = Number(((attended / totalSessions) * 100).toFixed(2));
        const status = getAttendanceStatus(percentage);
        const row = sheet.addRow([item.studentRoll, item.studentName || '', attended, totalSessions, percentage, status]);
        row.eachCell((cell) => {
          cell.fill = getStatusFill(percentage);
        });
      });

      setAutoColumnWidths(sheet);
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const teacherName = req.teacher.name.replace(/\s+/g, '_');
    const filename = `full_report_${teacherName}_${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
    return null;
  } catch (error) {
    return res.status(500).json({ error: 'Unable to export full report' });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { teacherId: req.teacher.id },
      include: { _count: { select: { attendance: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const result = sessions.map((session) => ({
      id: session.id,
      subject: session.subject,
      section: session.section,
      createdAt: session.createdAt,
      closed: session.closed,
      attendanceCount: session._count.attendance,
    }));

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to fetch session reports' });
  }
});

module.exports = router;
