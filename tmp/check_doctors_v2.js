const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const Doctor = require('../backend/src/models/Doctor');

async function check() {
    let output = '';
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        output += 'Connected to MongoDB\n';
        const doctors = await Doctor.find({});
        output += `Total Doctors: ${doctors.length}\n`;
        doctors.forEach(d => {
            output += `- ${d.name} (${d.doctor_id}) - is_active: ${d.is_active}\n`;
        });
        fs.writeFileSync(path.join(__dirname, 'doctor_check.txt'), output);
        process.exit(0);
    } catch (err) {
        fs.writeFileSync(path.join(__dirname, 'doctor_check.txt'), 'Error: ' + err.message);
        process.exit(1);
    }
}

check();
