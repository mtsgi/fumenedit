var currentMeasure = 0;
var currentLevel = "easy";
var previewHeight = 300;
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
            "raku": null,
            "easy": null,
            "normal": null,
            "hard": null,
            "ex": null
        },
        "author": "",
        "comment": ""
    },

    "raku": {},
    "easy": {},
    "normal": {},
    "hard": {},
    "extra": {}
};

$(document).ready( function(){
    inputFumendata(fumendata);
    updateFumendata();

    if( localStorage.getItem("fumenedit-level") ){
        $("#level").val(localStorage.getItem("fumenedit-level")).change();
        currentLevel = localStorage.getItem("fumenedit-level");
    }

    pushNotice("エディターを読み込みました。");

    //操作パネルの折りたたみ
    $("#info-toggle").on("click", () => {
        $("#info-forms").slideToggle(500);
    });
    $("#info-toggle-2").on("click", () => {
        $("#info-forms-2").slideToggle(500);
    });

    //メニューバーのトグル
    $("#menu-open").on("click", () => {
        $("#menu").css("left", "0px");
    });
    $("#menu-close").on("click", () => {
        $("#menu").css("left", "-220px");
    });

    //入力時に譜面情報を更新
    $("#info input").on("change", updateFumendata);
    $("#textarea").on("change", () =>{
        fumendata = JSON.parse( $("#textarea").val() );
        updateFumendata();
    });

    //小節移動
    $("#measure").on("change", () => {
        moveTo( Number($("#measure").val()) );
    }).val(0);

    //左右キーで小節移動
    $(document).on("keydown", function(e){
        //if(e.which == 37) $("#measure-prev").click();
        //else if(e.which == 39)  $("#measure-next").click();
      });

    //プレビューの高さ調整
    $("#height").on("change", () => {
        localStorage.setItem("fumenedit-height", $("#height").val());
        previewHeight = Number($("#height").val())
        moveTo(currentMeasure);
    }).val(300);
    if( localStorage.getItem("fumenedit-height") ){
        $("#height").val( localStorage.getItem("fumenedit-height") );
        previewHeight = Number(localStorage.getItem("fumenedit-height"))
    }

    //難易度切り替え
    $("#level").on("change", () => {
        currentLevel = $("#level").val();
        localStorage.setItem("fumenedit-level", currentLevel);
        moveTo(currentMeasure);
        pushNotice( currentLevel + "に切り替えました。");
    });

    //jsonファイルを書き出し
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

    //BPMに合わせてメトロノーム
    $("#bpm-play").on("click", () => {
        let ippaku = 60 / Number( fumendata.info.bpm ) * 1000;
        setTimeout( playGuide, 0 );
        setTimeout( playGuide, ippaku );
        setTimeout( playGuide, ippaku * 2 );
        setTimeout( playGuide, ippaku * 3 );
    });

    $("#demo-play").on("click", () => {
        $("#audio")[0].play();
    });

    //jsonファイルのインポート
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
                moveTo(currentMeasure);
            }
            catch(error){
                pushNotice( "譜面データの読み込みに失敗しました<br>" + error );
            }
        })
    });

    //譜面エディット
    $(".div-rest").off().on("click", ()=> {
    });
});

function pushNotice(STR){
    $("#notice").html(STR).fadeIn(100);
    console.log(STR);
}

//FDオブジェクトから譜面データの読み込み
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
    $("#lv-raku").val(FD.info.difficulty.raku);
    $("#lv-easy").val(FD.info.difficulty.easy);
    $("#lv-normal").val(FD.info.difficulty.normal);
    $("#lv-hard").val(FD.info.difficulty.hard);
    $("#comment").text(FD.info.comment);
    $("#audio").attr( "src", FD.info.music );
    countNotes(FD);
    pushNotice( "譜面データを読み込みました。" );
}

//入力値から譜面データの更新
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
        $("#audio").attr( "src", $("#music").val() );
        fumendata.info.offset = $("#offset").val();
        fumendata.info.author = $("#author").val();
        fumendata.info.difficulty.raku = $("#lv-raku").val();
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
    moveTo(currentMeasure);
}

//FDオブジェクトからノーツ数算出
function countNotes(FD){
    let notes = 0;
    for( let i in FD.raku ){
        for( let k of FD.raku[i] ){
            if( typeof k == "object" ) notes += k.length;
            else notes++;
        }
    }
    $("#lv-raku-notes").text( notes + "notes" );
    notes = 0;
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

//NUM小節をプレビュー
function moveTo(NUM){
    currentMeasure = NUM;
    let measureObject = fumendata[currentLevel][NUM];
    $("#measure").val(NUM);
    let time = 60 * 4 * Number(NUM) / Number(fumendata.info.bpm);
    if( !measureObject ){
        pushNotice(NUM + "小節を読み込めません。");
        $("#preview-area").html("<div id='measureinfo'>ノーツがありません 秒数:" + time + "</div>");
        return;
    }
    $("#preview-area").html( "<div id='measureinfo'>分割:" + measureObject.length + " 秒数:" + time + "</div>" );
    let per = measureObject.length;
    for( let i=0; i<per; i++ ){
        let APPEND = "<div class='preview-measure'><div class='div-num'>" + (i+1) + "</div>";
        //数字の時
        if( typeof measureObject[i] == "number" ){
            //1番レーン
            if( measureObject[i] == 1 ) APPEND += "<div class='div-note' data-cut='"+(i+1)+"' data-lane='1'></div>";
            else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='1'></div>";
            //2番レーン
            if( measureObject[i] == 2 ) APPEND += "<div class='div-note' data-cut='"+(i+1)+"' data-lane='2'></div>";
            else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='2'></div>";
            //3番レーン
            if( measureObject[i] == 3 ) APPEND += "<div class='div-note' data-cut='"+(i+1)+"' data-lane='3'></div>";
            else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='3'></div>";
            //4番レーン
            if( measureObject[i] == 4 ) APPEND += "<div class='div-note' data-cut='"+(i+1)+"' data-lane='4'></div>";
            else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='4'></div>";
            //5番レーン
            if( measureObject[i] == 5 ) APPEND += "<div class='div-note' data-cut='"+(i+1)+"' data-lane='5'></div>";
            else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='5'></div>";
        }
        //配列の時
        else if(typeof measureObject[i] == "object" ){
            //1番レーン
            if( measureObject[i].indexOf(1) >= 0 ) APPEND += "<div class='div-each' data-cut='"+(i+1)+"' data-lane='1'></div>";
            else if( measureObject[i].indexOf("a") >= 0 ) APPEND += "<div class='div-long-start' data-cut='"+(i+1)+"' data-lane='1'></div>";
            else if( measureObject[i].indexOf("A") >= 0 ) APPEND += "<div class='div-long-end' data-cut='"+(i+1)+"' data-lane='1'></div>";
            else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='1'></div>";
            //2番レーン
            if( measureObject[i].indexOf(2) >= 0 ) APPEND += "<div class='div-each' data-cut='"+(i+1)+"' data-lane='2'></div>";
            else if( measureObject[i].indexOf("b") >= 0 ) APPEND += "<div class='div-long-start' data-cut='"+(i+1)+"' data-lane='2'></div>";
            else if( measureObject[i].indexOf("B") >= 0 ) APPEND += "<div class='div-long-end' data-cut='"+(i+1)+"' data-lane='2'></div>";
            else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='2'></div>";
            //3番レーン
            if( measureObject[i].indexOf(3) >= 0 ) APPEND += "<div class='div-each' data-cut='"+(i+1)+"' data-lane='3'></div>";
            else if( measureObject[i].indexOf("c") >= 0 ) APPEND += "<div class='div-long-start' data-cut='"+(i+1)+"' data-lane='3'></div>";
            else if( measureObject[i].indexOf("C") >= 0 ) APPEND += "<div class='div-long-end' data-cut='"+(i+1)+"' data-lane='3'></div>";
            else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='3'></div>";
            //4番レーン
            if( measureObject[i].indexOf(4) >= 0 ) APPEND += "<div class='div-each' data-cut='"+(i+1)+"' data-lane='4'></div>";
            else if( measureObject[i].indexOf("d") >= 0 ) APPEND += "<div class='div-long-start' data-cut='"+(i+1)+"' data-lane='4'></div>";
            else if( measureObject[i].indexOf("D") >= 0 ) APPEND += "<div class='div-long-end' data-cut='"+(i+1)+"' data-lane='4'></div>";
            else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='4'></div>";
            //5番レーン
            if( measureObject[i].indexOf(5) >= 0 ) APPEND += "<div class='div-each' data-cut='"+(i+1)+"' data-lane='5'></div>";
            else if( measureObject[i].indexOf("e") >= 0 ) APPEND += "<div class='div-long-start' data-cut='"+(i+1)+"' data-lane='5'></div>";
            else if( measureObject[i].indexOf("E") >= 0 ) APPEND += "<div class='div-long-end' data-cut='"+(i+1)+"' data-lane='5'></div>";
            else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='5'></div>";
            
            //右フリック
            if( measureObject[i].indexOf("R") >= 0 ) APPEND += "<div class='div-right'></div>";
            //左フリック
            if( measureObject[i].indexOf("L") >= 0 ) APPEND += "<div class='div-left'></div>";
        }
        //文字の時
        else if( typeof measureObject[i] == "string" ){
            //音札とフリック
            if( measureObject[i] == "S" ) APPEND+= "<div class='div-skill'></div>";
            else if( measureObject[i] == "L" ) APPEND+= "<div class='div-rest'></div><div class='div-rest'></div><div class='div-rest'></div><div class='div-rest'></div><div class='div-rest'></div><div class='div-left'></div>";
            else if( measureObject[i] == "R" ) APPEND+= "<div class='div-rest'></div><div class='div-rest'></div><div class='div-rest'></div><div class='div-rest'></div><div class='div-rest'></div><div class='div-right'></div>";

            //ロングノーツ
            else{
                //1番レーン
                if( measureObject[i].indexOf("a") >= 0 ) APPEND += "<div class='div-long-start' data-cut='"+(i+1)+"' data-lane='1'></div>";
                else if( measureObject[i].indexOf("A") >= 0 ) APPEND += "<div class='div-long-end' data-cut='"+(i+1)+"' data-lane='1'></div>";
                else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='1'></div>";
                //2番レーン
                if( measureObject[i].indexOf("b") >= 0 ) APPEND += "<div class='div-long-start' data-cut='"+(i+1)+"' data-lane='2'></div>";
                else if( measureObject[i].indexOf("B") >= 0 ) APPEND += "<div class='div-long-end' data-cut='"+(i+1)+"' data-lane='2'></div>";
                else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='2'></div>";
                //3番レーン
                if( measureObject[i].indexOf("c") >= 0 ) APPEND += "<div class='div-long-start' data-cut='"+(i+1)+"' data-lane='3'></div>";
                else if( measureObject[i].indexOf("C") >= 0 ) APPEND += "<div class='div-long-end' data-cut='"+(i+1)+"' data-lane='3'></div>";
                else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='3'></div>";
                //4番レーン
                if( measureObject[i].indexOf("d") >= 0 ) APPEND += "<div class='div-long-start' data-cut='"+(i+1)+"' data-lane='4'></div>";
                else if( measureObject[i].indexOf("D") >= 0 ) APPEND += "<div class='div-long-end' data-cut='"+(i+1)+"' data-lane='4'></div>";
                else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='4'></div>";
                //5番レーン
                if( measureObject[i].indexOf("e") >= 0 ) APPEND += "<div class='div-long-start' data-cut='"+(i+1)+"' data-lane='5'></div>";
                else if( measureObject[i].indexOf("E") >= 0 ) APPEND += "<div class='div-long-end' data-cut='"+(i+1)+"' data-lane='5'></div>";
                else APPEND += "<div class='div-rest' data-cut='"+(i+1)+"' data-lane='5'></div>";
            }
        }
        APPEND += "</div>";
        $("#preview-area").append( APPEND );
    }
    $(".preview-measure div").css("height", previewHeight / measureObject.length + "px");
}

//メトロノーム(ガイド音)を1回再生するだけ
function playGuide(){
    new Audio("guide.mp3").play();
}

function playCurrentMeasure(){
    document.getElementById("audio").currentTime =  60 * 4 * currentMeasure / Number(fumendata.info.bpm) + fumendata.info.offset / 1000;
    console.log("再生を開始:" + 60 * 4 * currentMeasure / Number(fumendata.info.bpm) + fumendata.info.offset / 1000);
    document.getElementById("audio").play();
    setTimeout(() => {
        document.getElementById("audio").pause();
    }, 60 / Number( fumendata.info.bpm ) * 4);
}