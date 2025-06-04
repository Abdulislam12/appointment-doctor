const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generatePDF = async (data) => {
  return new Promise((resolve, reject) => {
    const filename = `prescription_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, "../temp_pdfs", filename);

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc
      .fontSize(20)
      .text("Medical Prescription", { align: "center" })
      .moveDown();
    doc.fontSize(12).text(`Doctor: Dr. ${data.doctorName}`);
    doc.text(`Patient: ${data.patientName}`);
    doc.text(`Age: ${data.age}, Gender: ${data.gender}`);
    doc.text(`Date: ${data.date}`).moveDown();

    doc
      .fontSize(14)
      .text("Diagnosis:")
      .fontSize(12)
      .text(data.diagnosis)
      .moveDown();
    doc.fontSize(14).text("Medicines:");
    data.medicines.forEach((med, i) => {
      doc.fontSize(12).text(`${i + 1}. ${med}`);
    });

    doc.moveDown();
    doc
      .fontSize(14)
      .text("Advice:")
      .fontSize(12)
      .text(data.advice || "None");

    doc.end();

    stream.on("finish", () => resolve({ filepath, filename }));
    stream.on("error", reject);
  });
};

module.exports = { generatePDF };
