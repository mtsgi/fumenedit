var currentMeasure = 0;
var currentLevel = "easy";
var fumendata = {
    "info": {
        "name": "",
        "artist": "",
        "bpm": "150",
        "color": {
            "r": 255, "g": 255, "b": 255
        },
        "jacket": "",
        "music": "",
        "offset": 0,
        "difficulty": {
            "easy": null,
            "normal": null,
            "hard": null,
            "ex": null
        },
        "author": "",
        "comment": ""
    },

    "kantan": {},
    "easy": {},
    "normal": {},
    "hard": {},
    "extra": {}
};

$(document).ready( function(){
    inputFumendata(fumendata);
    updateFumendata();
    pushNotice("エディターを読み込みました。");

    $("#info-toggle").on("click", () => {
        $("#info-forms").slideToggle(500);
    });

    $("#info-toggle-2").on("click", () => {
        $("#info-forms-2").slideToggle(500);
    });

    $("#info input").on("change", updateFumendata);

    $("#measure").on("change", () => {
        moveTo( Number($("#measure").val()) );
    }).val(0);

    $("#level").on("change", () => {
        currentLevel = $("#level").val();
        moveTo(currentMeasure);
        pushNotice( currentLevel + "に切り替えました。");
    }).val("easy");

    $("#export").on("click", () => {
		let text = JSON.stringify(fumendata, null, 4);
		var blob = new Blob([text], {type: "application/json"});
		var a = document.getElementById("export");
		a.href = URL.createObjectURL(blob);
		a.target = "_blank";
		a.download = "譜面データ.json";
        pushNotice( "データを出力しました。" );
    });

    $("#notice").on("click", () => {
        $("#notice").fadeOut(100);
    });

    $("#jacket-view").on("click", () => {
        pushNotice("<img src='" + $("#jacket").val() + "'>");
    });

    $("#demo-play").on("click", () => {
        pushNotice("<audio src='" + $("#music").val() + "' controls></audio>");
    });

    document.forms.port.import.addEventListener("change", (e) => {
        let result = e.target.files[0];
        console.log(result);
        let reader = new FileReader();
        reader.readAsText( result );
        reader.addEventListener( "load", () => {
            $("#textarea").text(reader.result);
            try{
                fumendata = JSON.parse(reader.result);
                inputFumendata(fumendata);
            }
            catch(error){
                pushNotice( "譜面データの読み込みに失敗しました<br>" + error );
            }
        })
    });
});

function pushNotice(STR){
    $("#notice").html(STR).fadeIn(100);
    console.log(STR);
}

function inputFumendata(FD){
    $("#name").val(FD.info.name);
    $("#artist").val(FD.info.artist);
    $("#bpm").val(FD.info.bpm);
    $("#r").val(FD.info.color.r);
    $("#g").val(FD.info.color.g);
    $("#b").val(FD.info.color.b);
    $("#jacket").val(FD.info.jacket);
    $("#music").val(FD.info.music);
    $("#offset").val(FD.info.offset);
    $("#author").val(FD.info.author);
    $("#lv-easy").val(FD.info.difficulty.easy);
    $("#lv-normal").val(FD.info.difficulty.normal);
    $("#lv-hard").val(FD.info.difficulty.hard);
    $("#comment").text(FD.info.comment);
    countNotes(FD);
    pushNotice( "譜面データを読み込みました。" );
}

function updateFumendata(){
    try {  
        fumendata.info.name = $("#name").val();
        fumendata.info.artist = $("#artist").val();
        fumendata.info.bpm = $("#bpm").val();
        fumendata.info.color.r = $("#r").val();
        fumendata.info.color.g = $("#g").val();
        fumendata.info.color.b = $("#b").val();
        fumendata.info.jacket = $("#jacket").val();
        fumendata.info.music = $("#music").val();
        fumendata.info.offset = $("#offset").val();
        fumendata.info.author = $("#author").val();
        fumendata.info.difficulty.easy = $("#lv-easy").val();
        fumendata.info.difficulty.normal = $("#lv-normal").val();
        fumendata.info.difficulty.hard = $("#lv-hard").val();
        fumendata.info.comment = $("#comment").val();
        countNotes(fumendata);
        pushNotice( "譜面データを更新しました。" );
    } catch (error) {
        pushNotice( "ファイルをロードし直してください。" );
    }
    $("#notice").fadeOut(1500);
    $("#textarea").text(JSON.stringify(fumendata, null, 4))
}

function countNotes(FD){
    let notes = 0;
    for( let i in FD.easy ){
        for( let k of FD.easy[i] ){
            if( typeof k == "object" ) notes += k.length;
            else notes++;
        }
    }
    $("#lv-easy-notes").text( notes + "notes" );
    notes = 0;
    for( let i in FD.normal ){
        for( let k of FD.normal[i] ){
            if( typeof k == "object" ) notes += k.length;
            else notes++;
        }
    }
    $("#lv-normal-notes").text( notes + "notes" );
    notes = 0;
    for( let i in FD.hard ){
        for( let k of FD.hard[i] ){
            if( typeof k == "object" ) notes += k.length;
            else notes++;
        }
    }
    $("#lv-hard-notes").text( notes + "notes" );
    notes = 0;
    for( let i in FD.extra ){
        for( let k of FD.extra[i] ){
            if( typeof k == "object" ) notes += k.length;
            else notes++;
        }
    }
    $("#lv-ex-notes").text( notes + "notes" );
}

function moveTo(NUM){
    currentMeasure = NUM;
    let measureObject = fumendata[currentLevel][NUM];
    $("#measure").val(NUM);
    if( !measureObject ){
        pushNotice(NUM + "小節を読み込めません。");
        $("#preview-area").text("ノーツがありません");
        return;
    }
    $("#preview-area").text( measureObject.length + "分割" );
    let per = measureObject.length;
    for( let i=0; i<per; i++ ){
        $("#preview-area").append("<div>"+measureObject[i]+"</div>")
    }
}