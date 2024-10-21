import MasukData from "../models/MasukDataModel.js";
import path from "path";
import { promisify } from "util";
import fs from "fs";
import UbahHarga from "../models/UbahHargaModel.js";
export const getMasukData = async (req, res) => {
  try {
    const response = await MasukData.findAll();
    res.status(200).json(response);
  } catch (error) {
    res.status(404).json({ msg: "Data Tidak Ada" });
  }
};
export const getMasukDatabyId = async (req, res) => {
  try {
    const response = await MasukData.findOne({
      where: {
        id: req.params.id,
      },
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(404).json({ msg: "Data Tidak Ada" });
  }
};
const hargaRP = (number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(number);
};

export const createMasukData = async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0)
    return res.status(400).json({ msg: "no File UPLOAD" });

  const bagian = req.body.bagian;
  const plat = req.body.plat;
  const km_awal = req.body.km_awal;
  const km_akhir = req.body.km_akhir;
  const selisih_km = km_akhir - km_awal;
  const jumlah_cc = req.body.jumlah_cc;
  const jenis_bensin = req.body.jenis_bensin;
  const pembayaran = req.body.pembayaran;
  const harga_disetujui = req.body.harga_disetujui;
  const validasi = req.body.validasi;
  const now = new Date();
  const detik = now.getSeconds();

  const foto_nota = req.files.foto_nota;
  const foto_km_awal = req.files.foto_km_awal;
  const foto_km_akhir = req.files.foto_km_akhir;

  const fileSize1 = foto_nota.data.length;
  const fileSize2 = foto_km_awal.data.length;
  const fileSize3 = foto_km_akhir.data.length;

  const ext1 = path.extname(foto_nota.name);
  const ext2 = path.extname(foto_km_awal.name);
  const ext3 = path.extname(foto_km_akhir.name);

  const file1 = detik + foto_nota.md5 + ext1;
  const file2 = detik + foto_km_awal.md5 + ext2;
  const file3 = detik + foto_km_akhir.md5 + ext3;

  const url_nota = `${req.protocol}://${req.get("host")}/img/${file1}`;
  const url_km_awal = `${req.protocol}://${req.get("host")}/img/${file2}`;
  const url_km_akhir = `${req.protocol}://${req.get("host")}/img/${file3}`;

  const allowedType = [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"];
  if (
    !allowedType.includes(ext1.toLowerCase()) ||
    !allowedType.includes(ext2.toLowerCase()) ||
    !allowedType.includes(ext3.toLowerCase())
  )
    return res.status(422).json({ msg: "invalid images" });

  if (fileSize1 > 5000000 || fileSize2 > 5000000 || fileSize3 > 5000000)
    return res.status(422).json({ msg: " file harus kurang dari 5 MB" });

  let nilaiCC;

  if (jumlah_cc == 1000) {
    nilaiCC = 20;
  } else if (jumlah_cc == 1200) {
    nilaiCC = 18;
  } else if (jumlah_cc == 1300) {
    nilaiCC = 16;
  } else if (jumlah_cc == 1500) {
    nilaiCC = 14;
  } else if (jumlah_cc == 1800) {
    nilaiCC = 12;
  } else if (jumlah_cc == 2000) {
    nilaiCC = 11;
  } else if (jumlah_cc == 2500) {
    nilaiCC = 10;
  } else {
    nilaiCC = 1;
  }

  const jumlahLiter = selisih_km / nilaiCC;

  const responseBensin = await UbahHarga.findAll();

  const hargaData = responseBensin[0]?.dataValues; 
  let hargaBensin = 0;

  if (hargaData) {
    if (jenis_bensin.toLowerCase() === "pertamax") {
      hargaBensin = hargaData.pertamax;
    } else if (jenis_bensin.toLowerCase() === "pertamax_turbo") {
      hargaBensin = hargaData.pertamax_turbo;
    } else if (jenis_bensin.toLowerCase() === "pertalite") {
      hargaBensin = hargaData.pertalite;
    } else if (jenis_bensin.toLowerCase() === "pertamina_dex") {
      hargaBensin = hargaData.pertamina_dex;
    } else if (jenis_bensin.toLowerCase() === "dexlite") {
      hargaBensin = hargaData.dexlite;
    } else if (jenis_bensin.toLowerCase() === "solar") {
      hargaBensin = hargaData.solar;
    } else {
      return res.status(400).json({ msg: "Jenis bensin tidak valid" });
    }

  } else {
    return res.status(404).json({ msg: "Harga bensin tidak ditemukan" });
  }

  const hargaAsli = jumlahLiter * hargaBensin
 
  const formattedJumlahLiter = jumlahLiter.toFixed(2);
  const formattedHargaAsli = hargaRP(hargaAsli);


  let status;
  const statusHatiHati = hargaAsli * 0.2 + hargaAsli;

  if (pembayaran >= 0 && pembayaran <= hargaAsli) {
    status = "Aman";
  } else if (pembayaran > hargaAsli && pembayaran <= statusHatiHati) {
    status = "Hati-Hati";
  } else if (pembayaran > statusHatiHati) {
    status = "Bahaya";
  }


  try {
    await Promise.all([
      promisify(foto_nota.mv)(`./public/img/${file1}`),
      promisify(foto_km_awal.mv)(`./public/img/${file2}`),
      promisify(foto_km_akhir.mv)(`./public/img/${file3}`),
    ]);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ msg: err.message });
  }

  try {
    await MasukData.create({
      bagian: bagian,
      plat: plat,
      km_awal: km_awal,
      km_akhir: km_akhir,
      selisih_km: selisih_km,
      jumlah_cc: jumlah_cc,
      jenis_bensin: jenis_bensin,
      pembayaran: pembayaran,
      harga_disetujui: harga_disetujui,
      validasi: validasi,
      keterangan: status,
      foto_nota: file1,
      foto_km_awal: file2,
      foto_km_akhir: file3,
      url_nota: url_nota,
      url_km_awal: url_km_awal,
      url_km_akhir: url_km_akhir,
    });
    res
      .status(201)
      .json({
        message: "Data berhasil ditambahkan",
        jumlahLiter: formattedJumlahLiter,
        hargaAsli: formattedHargaAsli,
        statusHatiHati,
        status
      });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

export const updateMasukData = async (req, res) => {
  const { id } = req.params;

  const masukData = await MasukData.findByPk(id);
  if (!masukData) return res.status(404).json({ msg: "Data tidak ditemukan" });

  if (!req.files || Object.keys(req.files).length === 0)
    return res.status(400).json({ msg: "no File UPLOAD" });

  const bagian = req.body.bagian;
  const plat = req.body.plat;
  const km_awal = req.body.km_awal;
  const km_akhir = req.body.km_akhir;
  const selisih_km = km_akhir - km_awal;
  const jumlah_cc = req.body.jumlah_cc;
  const jenis_bensin = req.body.jenis_bensin;
  const pembayaran = req.body.pembayaran;
  const harga_disetujui = req.body.harga_disetujui;
  const validasi = req.body.validasi;
  const now = new Date();
  const detik = now.getSeconds();

  const foto_nota = req.files.foto_nota;
  const foto_km_awal = req.files.foto_km_awal;
  const foto_km_akhir = req.files.foto_km_akhir;

  const fileSize1 = foto_nota.data.length;
  const fileSize2 = foto_km_awal.data.length;
  const fileSize3 = foto_km_akhir.data.length;

  const ext1 = path.extname(foto_nota.name);
  const ext2 = path.extname(foto_km_awal.name);
  const ext3 = path.extname(foto_km_akhir.name);

  const file1 = detik + foto_nota.md5 + ext1;
  const file2 = detik + foto_km_awal.md5 + ext2;
  const file3 = detik + foto_km_akhir.md5 + ext3;

  const url_nota = `${req.protocol}://${req.get("host")}/img/${file1}`;
  const url_km_awal = `${req.protocol}://${req.get("host")}/img/${file2}`;
  const url_km_akhir = `${req.protocol}://${req.get("host")}/img/${file3}`;

  const allowedType = [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"];
  if (
    !allowedType.includes(ext1.toLowerCase()) ||
    !allowedType.includes(ext2.toLowerCase()) ||
    !allowedType.includes(ext3.toLowerCase())
  )
    return res.status(422).json({ msg: "invalid images" });

  if (fileSize1 > 5000000 || fileSize2 > 5000000 || fileSize3 > 5000000)
    return res.status(422).json({ msg: " file harus kurang dari 5 MB" });

  let nilaiCC;

  if (jumlah_cc == 1000) {
    nilaiCC = 20;
  } else if (jumlah_cc == 1200) {
    nilaiCC = 18;
  } else if (jumlah_cc == 1300) {
    nilaiCC = 16;
  } else if (jumlah_cc == 1500) {
    nilaiCC = 14;
  } else if (jumlah_cc == 1800) {
    nilaiCC = 12;
  } else if (jumlah_cc == 2000) {
    nilaiCC = 11;
  } else if (jumlah_cc == 2500) {
    nilaiCC = 10;
  } else {
    nilaiCC = 1;
  }

  const jumlahLiter = selisih_km / nilaiCC;

  const responseBensin = await UbahHarga.findAll();
  const hargaData = responseBensin[0]?.dataValues;
  let hargaBensin = 0;

  if (hargaData) {
    if (jenis_bensin.toLowerCase() === "pertamax") {
      hargaBensin = hargaData.pertamax;
    } else if (jenis_bensin.toLowerCase() === "pertamax_turbo") {
      hargaBensin = hargaData.pertamax_turbo;
    } else if (jenis_bensin.toLowerCase() === "pertalite") {
      hargaBensin = hargaData.pertalite;
    } else if (jenis_bensin.toLowerCase() === "pertamina_dex") {
      hargaBensin = hargaData.pertamina_dex;
    } else if (jenis_bensin.toLowerCase() === "dexlite") {
      hargaBensin = hargaData.dexlite;
    } else if (jenis_bensin.toLowerCase() === "solar") {
      hargaBensin = hargaData.solar;
    } else {
      return res.status(400).json({ msg: "Jenis bensin tidak valid" });
    }
  } else {
    return res.status(404).json({ msg: "Harga bensin tidak ditemukan" });
  }

  const hargaAsli = jumlahLiter * hargaBensin;

  const formattedJumlahLiter = jumlahLiter.toFixed(2);
  const formattedHargaAsli = hargaRP(hargaAsli);

  let status;
  const statusHatiHati = hargaAsli * 0.2 + hargaAsli;

  if (pembayaran >= 0 && pembayaran <= hargaAsli) {
    status = "Aman";
  } else if (pembayaran > hargaAsli && pembayaran <= statusHatiHati) {
    status = "Hati-Hati";
  } else if (pembayaran > statusHatiHati) {
    status = "Bahaya";
  }

  try {
    await Promise.all([
      promisify(foto_nota.mv)(`./public/img/${file1}`),
      promisify(foto_km_awal.mv)(`./public/img/${file2}`),
      promisify(foto_km_akhir.mv)(`./public/img/${file3}`),
    ]);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ msg: err.message });
  }

  try {
    await masukData.update({
      bagian: bagian,
      plat: plat,
      km_awal: km_awal,
      km_akhir: km_akhir,
      selisih_km: selisih_km,
      jumlah_cc: jumlah_cc,
      jenis_bensin: jenis_bensin,
      pembayaran: pembayaran,
      harga_disetujui: harga_disetujui,
      validasi: validasi,
      keterangan: status,
      foto_nota: file1,
      foto_km_awal: file2,
      foto_km_akhir: file3,
      url_nota: url_nota,
      url_km_awal: url_km_awal,
      url_km_akhir: url_km_akhir,
    });
    res.status(200).json({
      message: "Data berhasil diperbarui",
      jumlahLiter: formattedJumlahLiter,
      hargaAsli: formattedHargaAsli,
      statusHatiHati,
      status,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};


export const deleteMasukData = async (req, res) => {
  try {
    const { id } = req.params;

    const masukData = await MasukData.findOne({
      where: {
        id: id,
      },
    });

    if (!masukData) {
      return res.status(404).json({ msg: "Data tidak ditemukan" });
    }

    fs.unlinkSync(`./public/img/${masukData.foto_nota}`); 
    fs.unlinkSync(`./public/img/${masukData.foto_km_awal}`); 
    fs.unlinkSync(`./public/img/${masukData.foto_km_akhir}`); 

    await MasukData.destroy({
      where: {
        id: id,
      },
    });

    res.status(200).json({ msg: "Data berhasil dihapus" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: error.message });
  }
};
