var fumendata = new Object();

$(document).ready( function(){
    $("#info-toggle").on("click", () => {
        $("#info-forms").slideToggle(500);
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
            }
            catch(error){
                alert( "譜面データの読み込みに失敗しました\n\n" + error );
            }
            attatchFumendata(fumendata);
        })
    });
});

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
    for( let i in FD.hard ){
        for( let k of FD.hard[i] ){
            if( typeof k == "object" ) notes += k.length;
            else notes++;
        }
    }
    $("#lv-hard-notes").text( notes + "notes" )
}