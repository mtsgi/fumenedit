var fumendata = new Object();

$(document).ready( function(){
    pushNotice("エディターを読み込みました(クリックで閉じる)。");

    $("#info-toggle").on("click", () => {
        $("#info-forms").slideToggle(500);
    });

    $("#export").on("click", () => {
		let text = JSON.stringify(fumendata);
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
                attatchFumendata(fumendata);
            }
            catch(error){
                pushNotice( "譜面データの読み込みに失敗しました<br>" + error );
            }
        })
    });
});

function pushNotice(STR){
    $("#notice").html(STR).fadeIn(100);
}

function attatchFumendata(FD){
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
    for( let i in FD.extra ){
        for( let k of FD.extra[i] ){
            if( typeof k == "object" ) notes += k.length;
            else notes++;
        }
    }
    $("#lv-ex-notes").text( notes + "notes" );
    notes = 0;
    for( let i in FD.hard ){
        for( let k of FD.hard[i] ){
            if( typeof k == "object" ) notes += k.length;
            else notes++;
        }
    }
    $("#lv-hard-notes").text( notes + "notes" );
    pushNotice( "譜面データを読み込みました。" );
}