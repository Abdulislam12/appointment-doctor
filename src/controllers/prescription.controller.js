const { generatePDF } = require("../services/prescription.service");

const createPrescription = async (req, res) => {
  try {
    const { filepath, filename } = await generatePDF(req.body);
    res.status(200).json({
      message: "Prescription generated successfully",
      downloadUrl: `/prescription/download/${filename}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generating prescription" });
  }
};

const downloadPrescription = (req, res) => {
  const filepath = `./temp_pdfs/${req.params.filename}`;
  res.download(filepath, (err) => {
    if (err) {
      res.status(404).json({ message: "File not found" });
    }
  });
};

module.exports = {
  createPrescription,
  downloadPrescription,
};
