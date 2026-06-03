const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendAbsentAlert(teacherEmail, subject, absentStudents) {
  if (!teacherEmail || !Array.isArray(absentStudents)) {
    throw new Error('Invalid email or absent student list');
  }

  const absentList = absentStudents
    .map((student) => `<li>${student.studentRoll}${student.studentName ? ` - ${student.studentName}` : ''}</li>`)
    .join('');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: teacherEmail,
    subject: `Absent Students Report for ${subject}`,
    html: `<p>Dear Teacher,</p><p>The following students were absent for ${subject}:</p><ul>${absentList}</ul><p>Please follow up as needed.</p>`,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {
  sendAbsentAlert,
};
