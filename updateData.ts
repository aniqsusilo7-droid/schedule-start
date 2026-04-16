import { supabase } from './supabaseClient';

const updateData = async () => {
    const masterReference = [
        {"type": "EBD", "s": "09076 [01 - 04]", "t": "09106", "u": "09136", "v": "09166", "w": "09196", "demo": "1004101<br/>10041 [12 - 14]", "dry": "10082 [01 - 07]", "rec": "10116 [01 - 03]", "silo": "1015", "sa": "09023 [01 - 06]", "util": ""},
        {"type": "ESF", "s": "09067<br/>09068<br/>09069<br/>09070", "t": "09097<br/>09098<br/>09099<br/>09100", "u": "09127<br/>09128<br/>09129<br/>09130", "v": "09157<br/>09158<br/>09159<br/>09160", "w": "09187<br/>09188<br/>09189<br/>09190", "demo": "10027 [01 - 18]<br/><br/>1002733", "dry": "10067 [01 - 27]<br/><br/>10068 [01 - 18]<br/><span class=\"text-[24px] text-slate-800 font-bold\">2,4,5&10 tdk ada</span>", "rec": "10108 [01-31]", "silo": "1014", "sa": "09020 [01 - 10]", "util": ""},
        {"type": "TIMER", "s": "09077<br/>09078<br/>09079<br/>09080", "t": "09107<br/>09108<br/>09109<br/>09110", "u": "09137<br/>09138<br/>09139<br/>09140", "v": "09167<br/>09168<br/>09169<br/>09170", "w": "09197<br/>09198<br/>09199<br/>09200", "demo": "10043", "dry": "10083", "rec": "10118", "silo": "10152", "sa": "9024", "util": ""},
        {"type": "ELC", "s": "09071<br/>09072<br/>09073", "t": "09101<br/>09102<br/>09103", "u": "09131<br/>09132<br/>09133", "v": "09161<br/>09162<br/>09163", "w": "09191<br/>09192<br/>09193", "demo": "10026<br/>10028", "dry": "10066<br/>10067<br/>10068<br/>10070", "rec": "10106<br/>10108<br/>10110", "silo": "10141<br/>10142<br/>10143", "sa": "09019", "util": "10181<br/>10183<br/>10186"}
    ];

    const specialNotes = [
        {"cat": "RE-S grade", "code": "EBD0907626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "RE-T grade", "code": "EBD0910626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "RE-U grade", "code": "EBD0913626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "RE-V grade", "code": "EBD0916626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "RE-W grade", "code": "EBD0919626.DT03", "color": "bg-[#b2dfdb]/60 dark:bg-emerald-900/20"},
        {"cat": "Drying Grade", "code": "EBD1019110.DT06", "bold": true, "color": "bg-white/80"},
        {"cat": "Blowdown A", "code": "EBD1019110.DT07"},
        {"cat": "Blowdown B", "code": "EBD1019110.DT08"},
        {"cat": "Slurry Tank", "code": "EBD1019110.DT09"},
        {"cat": "Silo O Grade", "code": "EBD1019110.DT10"},
        {"cat": "Silo P Grade", "code": "EBD1019110.DT11"},
        {"cat": "Silo Q Grade", "code": "EBD1019110.DT12"},
        {"cat": "LOT NUMBER DI PI", "code": "EBD1015111.NX01"},
        {"cat": "LOT NUMBER DI SILO", "code": "EBD1015111.NX02<br/>EBD1015111.NX03<br/>EBD1015111.NX04"}
    ];

    const gradeControl = [
        {"code": "ESF0907201", "desc": "E-PO GRADE MATCHFOR BL"},
        {"code": "ESF1018222", "desc": "GRADE CTRL RE-S"},
        {"code": "ESF1018223", "desc": "GRADE CTRL RE-T"},
        {"code": "ESF1018224", "desc": "GRADE CTRL RE-U"},
        {"code": "ESF1018225", "desc": "GRADE CTRL RE-V"},
        {"code": "ESF1018226", "desc": "GRADE CTRL RE-W"},
        {"code": "ESF1018227", "desc": "GRADE CTRL VE-E118A"},
        {"code": "ESF1018228", "desc": "GRADE CTRL VE-E118B"},
        {"code": "ESF1018229", "desc": "GRADE CTRL DEMONOMER"},
        {"code": "ESF1018230", "desc": "GRADE CTRL VE-E202"},
        {"code": "ESF1018231", "desc": "GRADE CTRL DRYING"},
        {"code": "ESF1018232", "desc": "GRADE CTRL SILO O"},
        {"code": "ESF1018233", "desc": "GRADE CTRL SILO P"},
        {"code": "ESF1018234", "desc": "GRADE CTRL SILO Q"},
        {"code": "ECT0907703", "desc": "WASH CT"}
    ];

    const { error } = await supabase
        .from('catatan_data')
        .update({
            master_reference: masterReference,
            special_notes: specialNotes,
            grade_control: gradeControl
        })
        .eq('id', 1);

    if (error) {
        console.error("Error updating data:", error);
    } else {
        console.log("Data updated successfully!");
    }
};

updateData();
