const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Doctor = require('./backend/src/models/Doctor');

dotenv.config({ path: './backend/.env' });

async function checkDoctors() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const doctors = await Doctor.find({});
        console.log(`Total doctors: ${doctors.length}`);
        doctors.forEach(d => {
            console.log(`- ${d.name} (${d.doctor_id}), Active: ${d.is_active}, Speciality: ${d.speciality}`);
        });
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkDoctors();
