"use strict";

const kaf = new Kaf({
  elem: 'body',
  data: {
    maxMeasure: 0,
    infoDisp: false
  },
  events: {
    loadSample() {
      fetch('./otofuda.json')
        .then(res => res.json())
        .then(data => {
          fumenObject = data;
          prev = {
            "raku": null, "easy": null, "normal": null, "hard": null, "extra": null
          };
          console.log('譜面データをロード', fumenObject);
          selectLevel(currentLevel);
        });
    },
    copy_measure() {
      const target_notes = fumenObject[currentLevel].filter(note => note.measure == this.copy_measure_from).filter(note => note.type != 2);
      if(window.confirm(`${target_notes.length}ノーツを${this.copy_measure_level}の${this.copy_measure_to}小節にコピーします(ロングノーツはコピーしません)。よろしいですか？`)) {
        const converted_notes = target_notes.map(note => {
          let new_obj = Object.assign({}, note, { measure: Number(this.copy_measure_to) });
          return new_obj;
        });
        fumenObject[this.copy_measure_level].push(...converted_notes);
        drawPreview(fumenObject[currentLevel]);
        message('コピーが完了しました。');
      }
    },
    flip() {
      const flipped_notes = fumenObject[currentLevel].map(note => {
        if(note.measure == this.flip_measure) {
          const new_lane = 6 - note.lane;
          let new_obj = Object.assign(note, { lane: new_lane });
          if(note.type == 2) {
            new_obj.end = new_obj.end.map(end => Object.assign(end, { lane: 6 - end.lane }));
          }
          else if(note.type == 3) new_obj.type = 4;
          else if(note.type == 4) new_obj.type = 3;
          return new_obj;
        }
        else return note;
      });
      fumenObject[currentLevel] = flipped_notes;
      drawPreview(fumenObject[currentLevel]);
      message('左右反転しました。');
    },
    alldisp() {
      if(this.infoDisp) {
        this.infoDisp = false;
        document.querySelector('#preview').classList.remove('-alldisp');
      }
      else {
        this.infoDisp = true;
        document.querySelector('#preview').classList.add('-alldisp');
      }
      // document.querySelectorAll('#preview > span:not(.measure)').forEach(el => el.classList.add('-alldisp'));
    },
    validate() {
      // 音札ノーツの検査
      let results = ['・各難易度のtype5(音札ノーツ)位置'];
      const raku = fumenObject.raku
        .filter(n => n.type === 5)
        .map(note => `${note.measure} ${note.position}/${note.split}`)
        .sort((a, b) => a - b);
      results.push(JSON.stringify(raku));

      const easy = fumenObject.easy
        .filter(n => n.type === 5)
        .map(note => `${note.measure} ${note.position}/${note.split}`)
        .sort((a, b) => a - b);
      results.push(JSON.stringify(easy));

      const normal = fumenObject.normal
        .filter(n => n.type === 5)
        .map(note => `${note.measure} ${note.position}/${note.split}`)
        .sort((a, b) => a - b);
      results.push(JSON.stringify(normal));

      const hard = fumenObject.hard
        .filter(n => n.type === 5)
        .map(note => `${note.measure} ${note.position}/${note.split}`)
        .sort((a, b) => a - b);
      results.push(JSON.stringify(hard));

      const extra = fumenObject.extra
        .filter(n => n.type === 5)
        .map(note => `${note.measure} ${note.position}/${note.split}`)
        .sort((a, b) => a - b);
      results.push(JSON.stringify(extra));

      // 重複ノーツの検査
      results.push(`・${currentLevel}の重複ノーツ検査`);
      for(const i in fumenObject[currentLevel]) {
        const self = fumenObject[currentLevel][i];
        const self_timing = self.measure + (self.position / self.split);
        for(const k in fumenObject[currentLevel]) {
          const note = fumenObject[currentLevel][k];
          const note_timing = note.measure + (note.position / note.split);
          if(i !== k && self_timing === note_timing && self.lane === note.lane && self.type === note.type) {
            results.push("(！)重複ノーツがあります：", JSON.stringify(self));
          }
        }
      }
      results.push(`--- 重複検査END ---`);
      message(...results);
    },
    output() {
      window.open(`data:,${JSON.stringify({
        ...fumenObject,
        info: {
          bpm: Number(kaf.info_bpm),
          beat: Number(kaf.info_beat),
          offset: Number(kaf.info_offset)
        }
      }, null, 4).replace(/\n|\r\n|\r/gi, '%0D')}`);
    },
    capture() {
      const result = window.confirm("本当にキャプチャモードを開始しますか？(一度開始すると、元の画面には戻れません)");
      if(result) {
        this.infoDisp = true;
        document.querySelector('#preview').classList.add('-alldisp');
        const loadCss = window.confirm("調整用CSSを読み込みますか？");
        if (loadCss) {
          document.querySelector('#ex-css').disabled = false;
        }
        document.querySelectorAll('.remove-on-capture').forEach(el => {
          el.parentNode.removeChild(el);
        });
      }
    }
  }
});

var fumenObject = {
  raku: [],
  easy: [],
  normal: [],
  hard: [],
  extra: [],
  info: {}
};
var prev = {
  "raku": null, "easy": null, "normal": null, "hard": null, "extra": null
};
var measureHeight = 200;
var currentLevel = "easy";
let liftValue = 20;
let preAudio = new Audio();
let INTERVAL;
let one_measure;
let tap_sounds = [];
let tap_timings = [];
let preview_timings = [];

$(document).ready(function() {
  window.addEventListener('beforeunload', function(e) {
    e.preventDefault();
    e.returnValue = '移動してもよろしいですか？';
  });

  // SUD+調整機能
  document.querySelector('#preview-sud').addEventListener('change', e => {
    document.querySelector('#sudden').style.height = `${e.target.value}px`;
  });

  //ノーツを追加
  $("#form-add").on("click", () => {
    prev[currentLevel] = fumenObject[currentLevel];
    let type = Number($("#form-type").val())
    let measure = Number($("#form-measure").val());

    let lane = -1;
    if(type == 1 || type == 2) {
      lane = Number($("#form")[0].lane.value);
    }
    else if(type == 3 || type == 4) {
      lane = Number($("#form")[0].lane.value);
      // if(lane == 1 || lane == 5) {
      //   message("そのレーン位置にフリックノーツを配置することはできません。");
      //   return;
      // }
    }
    else if(type == 5) lane = 3;

    let position = Number($("#form-position").val());
    let split = Number($("#form-split").val());
    let option = [];
    if(type == 97 || type == 98) {
      if(type == 97) option[0] = "beatchange";
      else if(type == 98) option[0] = "bpmchange";
      option[1] = Number($("#form-option").val());
    }
    if(type == 3 || type == 4) {
      option[0] = Number($("#form-option").val());
    }
    let end = [];
    if(type == 2) {
      end = [
        {
          "type": 1,
          "measure": Number($("#endform-measure").val()),
          "lane": Number($("#endform-lane").val()),
          "position": Number($("#endform-position").val()),
          "split": Number($("#endform-split").val()),
          "option": [],
          "end": []
        }
      ]
    }
    one_measure = 60 / Number(kaf.info_bpm) * Number(kaf.info_beat);
    const self_timing = one_measure * measure + one_measure * (position / split);
    // 重複チェック
    for(const note of fumenObject[currentLevel]) {
      const note_timing = one_measure * note.measure + one_measure * (note.position / note.split);
      if(self_timing === note_timing && lane === note.lane && type === note.type) {
        message("その場所にはすでにノートが配置されています。", JSON.stringify(note));
        return;
      }
    }
    // 音札ノーツは全難易度に挿入
    if(type == 5) {
      let _otofudanotesobj = {
        type,
        measure,
        lane,
        position,
        split,
        option,
        end
      }
      try {
        fumenObject.raku.push(_otofudanotesobj);
        fumenObject.easy.push(_otofudanotesobj);
        fumenObject.normal.push(_otofudanotesobj);
        fumenObject.hard.push(_otofudanotesobj);
        fumenObject.extra.push(_otofudanotesobj);
        message("音札ノーツを全ての難易度の同一箇所に挿入しました");
      } catch(error) {
        message(error);
      }
    }
    else fumenObject[currentLevel].push({
      type,
      measure,
      lane,
      position,
      split,
      option,
      end
    });
    if(type != 5) message(`${measure}小節にノートを配置しました。`);

    drawPreview(fumenObject[currentLevel]);
  });

  //小節の高さ
  if(localStorage.getItem("fumenedit-measure-height")) measureHeight = Number(localStorage.getItem("fumenedit-measure-height"));
  $("#measure-height-num").text(measureHeight);
  $("#measure-height").val(measureHeight).on("change", function() {
    measureHeight = this.value;
    $("#measure-height-num").text(measureHeight);
    localStorage.setItem("fumenedit-measure-height", this.value);
    selectLevel(currentLevel);
  });

  //キーボード操作
  $(document).on("keyup", (e) => {
    //Enterキーでノート追加
    if(e.which == 13) $("#form-add").click();
    //左右キーでlane移動
    else if(e.which == 37) {
      $("#form")[0].lane.value = Number($("#form")[0].lane.value) - 1;
      $("#endform-lane").val($("#form")[0].lane.value);
    }
    else if(e.which == 39) {
      $("#form")[0].lane.value = Number($("#form")[0].lane.value) + 1;
      $("#endform-lane").val($("#form")[0].lane.value);
    }
    //Shift押しながら上下でノーツ(始点)移動
    else if(e.shiftKey) {
      if(e.which == 38) {
        $("#form-position").val(Number($("#form-position").val()) - 1);
        $("#endform-position").val(Number($("#endform-position").val()) + 1);
      }
      else if(e.which == 40) {
        $("#form-position").val(Number($("#form-position").val()) + 1);
        $("#endform-position").val(Number($("#endform-position").val()) - 1);
      }
      let pos = Number($("#endform-position").val());
      let spl = Number($("#endform-split").val());
      if(pos < 0) {
        $("#endform-position").val(0);
      };
      if(pos == spl) {
        $("#endform-position").val(0);
        $("#endform-measure").val(Number($("#endform-measure").val()) + 1);
      };
      if(pos == -1) {
        $("#endform-position").val(spl - 1);
        $("#endform-measure").val(Number($("#endform-measure").val()) - 1);
      };
      if(spl < 1) {
        $("#endform-split").val(1);
      };
    }
    //スペースキーでノーツタイプ変更
    else if(e.which == 32) {
      if($("#form-type").val() == 99) $("#form-type").val(1);
      else if($("#form-type").val() == 5) $("#form-type").val(97);
      else $("#form-type").val(Number($("#form-type").val()) + 1);

      if($("#form-type").val() == 2) $("#endform").show();
      else $("#endform").hide();
    }
  }).on("keyup keydown keypress", () => drawShadow());

  //小節前後移動
  $("#form-prev").on("click", () => $("#form-measure").val(Number($("#form-measure").val()) - 1));
  $("#form-next").on("click", () => $("#form-measure").val(Number($("#form-measure").val()) + 1));

  //UndoとRedo
  $("#form-undo").on("click", () => {
    if(prev[currentLevel]) {
      fumenObject[currentLevel] = prev[currentLevel];
      prev[currentLevel] = null;
    }
    else message("Undoできません");
    drawPreview(fumenObject[currentLevel]);
  });

  $("#form-redo").on("click", () => {
    if(!prev[currentLevel]) {
      message("Redoできません");
      return;
    };
    fumenObject[currentLevel].push(prev[currentLevel]);
    prev[currentLevel] = null;
    message("Redoしました");
    drawPreview(fumenObject[currentLevel]);
  });

  //次の小節に移動
  $("#form-position").on("change", () => {
    let pos = Number($("#form-position").val());
    let spl = Number($("#form-split").val());
    if(pos < 0) {
      $("#form-position").val(0);
    };
    if(pos == spl) {
      $("#form-position").val(0);
      $("#form-next").click();
    };
    if(pos == -1) {
      $("#form-position").val(spl - 1);
      $("#form-prev").click();
    };
    if(spl < 1) {
      $("#form-split").val(1);
    };
  });
  $("#endform-position").on("change", () => {
    let pos = Number($("#endform-position").val());
    let spl = Number($("#endform-split").val());
    if(pos < 0) {
      $("#endform-position").val(0);
    };
    if(pos == spl) {
      $("#endform-position").val(0);
      $("#endform-measure").val(Number($("#endform-measure").val()) + 1);
    };
    if(pos == -1) {
      $("#endform-position").val(spl - 1);
      $("#endform-measure").val(Number($("#endform-measure").val()) - 1);
    };
    if(spl < 1) {
      $("#endform-split").val(1);
    };
  });

  //シャドーノーツ(置く場所の目印)を表示
  $("input, select").on("change", () => drawShadow());

  //フォームのタイプ変更時
  $("#form-type").on("change", function() {
    //ノーツタイプによってoptionキーの種類を表示
    let _type = $("#form-type").val();
    if(_type == 97) $("#form-option-key").text("beatchange");
    else if(_type == 98) $("#form-option-key").text("bpmchange");
    else if(_type == 3 || _type == 4) $("#form-option-key").text("notewidth");
    else $("#form-option-key").text("使用なし");

    //ロングなら終点フォームを表示
    if(this.value == 2) $("#endform").show();
    else $("#endform").hide();

    if(this.value == 97 || this.value == 98 || this.value == 3 || this.value == 4) {
      $("#form-option").css("background", "yellow");
    }
    else {
      $("#form-option").val('-1').css("background", "");
    }
  });

  message(currentLevel + "をロードしました");
});

function drawPreview(obj) {
  $("#preview").html("<canvas id='canvas' width='300'></canvas>");
  let notesnum = 0, notesid = 0, maxMeasure = 0;
  let notes_tap = 0, notes_long = 0, notes_flick = 0, notes_otofuda = 0;
  let notes_1 = 0, notes_2 = 0, notes_3 = 0, notes_4 = 0, notes_5 = 0;
  //1ノートずつ処理
  for(let i of obj) {
    notesid++;
    switch(i.type) {
      case 1:
        notes_tap++;
        notesnum++;
        break;
      case 2:
        notes_long++;
        notesnum++;
        break;
      case 3:
      case 4:
        notes_flick++;
        notesnum++;
        break;
      case 5:
        notes_otofuda++;
        notesnum++;
        break;
      default:
        break;
    }
    switch(i.lane) {
      case 1:
        notes_1++;
        break;
      case 2:
        notes_2++;
        break;
      case 3:
        notes_3++;
        break;
      case 4:
        notes_4++;
        break;
      case 5:
        notes_5++;
        break;
      default:
        break;
    }
    if(i.measure > maxMeasure) maxMeasure = i.measure;
    $("#preview").append(`<span id='note${notesid}' data-n='${(notesid - 1)}'><i class='noteinfo'>${i.position}/${i.split}</i></span>`);
    const noteEl = $(`#note${notesid}`);
    noteEl
      .addClass(`type${i.type}`)
      .addClass(`option${i.option}`)
      .css("right", (i.lane - 1) * 60)
      .css("top", (i.measure * measureHeight) + measureHeight * (i.position / i.split));
    if(i.position < 0 || i.position >= i.split) {
      noteEl.addClass('-error')
    }
    if(i.type == 98) {
      noteEl.text(i.option);
    }
    else if(i.type == 97) {
      noteEl.text(i.option + "/4");
    }
    else if(i.type == 99) {
      noteEl.text("EOF");
    }
    else if(i.type == 2) {
      for(let j in i.end) {
        // noteEl.text(notesid);
        const _end = i.end[j];
        if(Number(_end.measure) > maxMeasure) maxMeasure = Number(_end.measure);
        $("#preview").append(`
          <span id="end${notesid}-${j}" data-n="${(notesid - 1)}">
            <i class='noteinfo'>${_end.position}/${_end.split}</i>
          </span>`);
        $(`#end${notesid}-${j}`)
          .addClass("type" + _end.type)
          .css("right", (Number(_end.lane) - 1) * 60)
          .css("top", (Number(_end.measure) * measureHeight) + measureHeight * (Number(_end.position) / Number(_end.split)));
        if(_end.position < 0 || _end.position >= _end.split) {
          $(`#end${notesid}-${j}`).addClass('-error');
        }
        if(i.lane == _end.lane) {
          $("#preview").append(`<i id="long${notesid}-${j}" data-n="${(notesid - 1)}"></i>`);
          $(`#long${notesid}-${j}`)
            .addClass("long")
            .css("right", (Number(i.lane) - 1) * 60)
            .css("top", (Number(i.measure) * measureHeight) + measureHeight * (Number(i.position) / Number(i.split)))
            .css("height", Math.abs(((Number(i.measure) * measureHeight) + measureHeight * (Number(i.position) / Number(i.split))) - ((Number(_end.measure) * measureHeight) + measureHeight * (Number(_end.position) / Number(_end.split)))));
        }
      }
    }
    // キャンバス描画用(使用なし)
    else if(i.type == 2 && false) {
      var ctx = document.getElementById("canvas").getContext("2d");
      for(let j in i.end) {
        noteEl.append("<span id='end" + notesnum + "-" + j + "' data-n='" + (notesnum - 1) + "'></span>");
        $("#end" + notesnum + "-" + j).addClass("type" + i.end[j].type).css("right", (Number(i.end[j].lane) - 1) * 60).css("top", (Number(i.end[j].measure) * measureHeight) + measureHeight * (Number(i.end[j].position) / Number(i.end[j].split)));
        ctx.beginPath();
        ctx.moveTo(300 - (Number(i.lane) - 1) * 60, (Number(i.measure) * measureHeight) + measureHeight * (Number(i.position) / Number(i.split)));
        ctx.lineTo(300 - (Number(i.end[j].lane) - 1) * 60, (Number(i.end[j].measure) * measureHeight) + measureHeight * (Number(i.end[j].position) / Number(i.end[j].split)));
        console.log(ctx);
        ctx.stroke();
      }
    }
  }

  //クリックしたノートを削除
  $("#preview span").click(function() {
    prev[currentLevel] = fumenObject[currentLevel];
    if(fumenObject[currentLevel][this.getAttribute("data-n")].type == 5) message("[注意]音札ノーツを削除する場合は、全ての難易度で削除されているか確認してください");
    fumenObject[currentLevel].splice(this.getAttribute("data-n"), 1);
    drawPreview(fumenObject[currentLevel]);
  });

  //小節線の描画
  for(let i = 0; i <= maxMeasure; i++) {
    $("#preview").append(`<span id="measure${i}">${i}</span>`);
    $("#measure" + i)
      .addClass("measure")
      .css("top", i * measureHeight)
      .css("line-height", `${2 * measureHeight - 32}px`);
  }
  kaf.maxMeasure = maxMeasure;
  clearInterval(INTERVAL);

  $(".measure").css("height", measureHeight + "px");
  $("#notesnum").text(notesnum + " notes");
  $("#notesinfo").html(`[内訳]<br>
                        TAP ${notes_tap} (${Math.round(notes_tap / notesnum * 1000) / 10}%)<br>
                        LONG ${notes_long} (${Math.round(notes_long / notesnum * 1000) / 10}%)<br>
                        FLICK ${notes_flick} (${Math.round(notes_flick / notesnum * 1000) / 10}%)<br>
                        OTOFUDA ${notes_otofuda} (${Math.round(notes_otofuda / notesnum * 1000) / 10}%)<br>
                        [レーン別]<br>
                        壱: ${notes_1}　弐: ${notes_2}　参: ${notes_3}　肆: ${notes_4}　伍: ${notes_5}`);
  drawShadow();
}

function message(...text) {
  $("#debug").text('').show();
  for(const t of text) {
    $("#debug").append(`<div>${t}</div>`)
  }
  $("#debug").on("click", () => $("#debug").hide());
}

function drawShadow() {
  const _type = $("#form-type").val();
  const _option = $("#form-option").val();

  const _lane = Number($("#form")[0].lane.value);
  const _measure = Number($("#form-measure").val());
  const _pos = Number($("#form-position").val());
  const _spl = Number($("#form-split").val());

  $("#noteShadow, #noteShadowEnd, #long-shadow").remove();
  $("#preview").append("<span id='noteShadow'></span>");
  $("#noteShadow")
    .addClass(`type${_type}`)
    .addClass(`option${_option}`)
    .css("right", (_lane - 1) * 60)
    .css("top", (_measure * measureHeight) + measureHeight * (_pos / _spl));

  //シャドー終点の描画
  if(_type == 2) {
    $("#noteShadow").text("n");
    $("#preview").append("<span id='noteShadowEnd'>n</span>");
    $("#noteShadowEnd").addClass("type" + $("#endform-type").val()).css("right", (Number($("#endform-lane").val()) - 1) * 60).css("top", (Number($("#endform-measure").val()) * measureHeight) + measureHeight * (Number($("#endform-position").val()) / Number($("#endform-split").val())));
    $("#preview").append("<i id='long-shadow'></i>");
    $("#long-shadow")
      .addClass("long")
      .css("right", (Number($("#endform-lane").val()) - 1) * 60)
      .css("top", Number($("#form-measure").val()) * measureHeight + measureHeight * (Number($("#form-position").val()) / Number($("#form-split").val())))
      .css("height", Math.abs((_measure * measureHeight) + measureHeight * (_pos / _spl) - ((Number($("#endform-measure").val()) * measureHeight) + measureHeight * (Number($("#endform-position").val()) / Number($("#endform-split").val())))));
  }
}

function selectLevel(level) {
  if(!fumenObject[level]) {
    message(level + "は不明な難易度です");
  }
  else {
    currentLevel = level;
    message(level + "をロードしました");
    drawPreview(fumenObject[currentLevel]);
    $("#head-level").text(level);
  }
}

function openFile() {
  if(window.confirm("ファイルを開くと保存していない現在の内容は破棄されます。\n続行しますか？")) {
    let reader = new FileReader();
    reader.onload = function(event) {
      fumenObject = JSON.parse(event.target.result);
      prev = {
        "raku": null, "easy": null, "normal": null, "hard": null, "extra": null
      };
      console.log('譜面データをロード', fumenObject);
      if(fumenObject.info) {
        kaf.info_bpm = fumenObject.info.bpm;
        kaf.info_beat = fumenObject.info.beat;
        kaf.info_offset = fumenObject.info.offset;
        document.querySelector('#preview-bpm').value = kaf.info_bpm;
        document.querySelector('#preview-beat').value = kaf.info_beat;
        document.querySelector('#preview-offset').value = kaf.info_offset;
      }
      selectLevel(currentLevel);
      $("#form-loadsample").hide();
    };

    $('<input type="file" accept=".json, application/json">').on('change', function(event) {
      reader.readAsText(event.target.files[0]);
    })[0].click();
  }
}

function saveFile() {
  // 譜面情報を格納
  fumenObject.info = {
    bpm: Number(kaf.info_bpm),
    beat: Number(kaf.info_beat),
    offset: Number(kaf.info_offset)
  }
  let blob = new Blob([JSON.stringify(fumenObject, null, 4)], { type: "application/json" });
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '曲名.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function previewStart() {
  preAudio.pause();
  const _bpm = Number($("#preview-bpm").val());
  const _beat = Number($("#preview-beat").val());
  let _height = 0;
  const _start = Number($("#preview-measure").val());
  const _offset = Number($("#preview-offset").val())
  let _lift = $("#preview-lift").val();
  let _movelineMode = document.querySelector("#preview-line-mode").checked;
  clearInterval(INTERVAL);
  // タップ音の再生予約解除
  for(const t of tap_sounds) clearInterval(t);
  for(const t of preview_timings) clearInterval(t);
  tap_sounds = [];
  preview_timings = [];
  tap_timings = [];

  const playDelay = 100; // 処理待ち遅延(ms)
  let minusDelay = 0;

  if(_start > kaf.maxMeasure) {
    message(`${_start}小節がありません`);
    return false;
  }

  if(_movelineMode) {
    document.querySelector('#preview').insertAdjacentHTML('beforeend', '<div id="moveline">プレビュー</div>');
    //1小節ずつ進行
    _height += _start * (Number(measureHeight));
    $("#moveline").css("top", _height + "px");
    $("#moveline").css("transition", (60 / _bpm * _beat) + "s all linear");

    INTERVAL = setInterval(() => {
      _height += Number(measureHeight);
      $("#moveline").css("top", _height + "px");
      $("#moveline").css("transition", (60 / _bpm * _beat) + "s all linear");
    }, (60 / _bpm * _beat) * 1000);
  }
  else {
    $("#preview").addClass("playing").css("margin-top", `${-(_lift)}px`);
    $("#preline").css("height", `${_lift}px`).show();
    message("譜面プレビューを再生中です");

    // 1小節の長さ
    one_measure = (60 / _bpm * _beat);

    setTimeout(() => {
      //1小節ずつ進行
      _height += _start * (Number(measureHeight));
      $("#preview").css("top", _height + "px");
      $("#preview").css("transition", one_measure + "s all linear");

      for(let i = _start; i <= kaf.maxMeasure; i++) {
        const diff = i - _start;
        preview_timings.push(setTimeout(() => {
          $("#preview").css("top", i * (Number(measureHeight)) + "px");
          $("#preview").css("transition", one_measure + "s all linear");
        }, diff * one_measure * 1000));
      }

      INTERVAL = setInterval(() => {
        _height += Number(measureHeight);
      }, one_measure * 1000);
    }, playDelay);
  }

  if(_start < 0) {
    minusDelay = one_measure * -(_start) * 1000;
  }

  //音源オフセット分遅延再生
  preAudio.currentTime = one_measure * _start;
  preAudio.volume = Number(kaf.preview_volume_music);
  setTimeout(() => {
    preAudio.play().catch((err) => console.warn(err));
  }, _offset + playDelay + minusDelay);

  let comboNum = 0;
  const comboText = document.querySelector('#preline-combo-text');
  comboText.textContent = 0;

  const keybeamsElems = {
    1: document.querySelector('#keybeam-1'),
    2: document.querySelector('#keybeam-2'),
    3: document.querySelector('#keybeam-3'),
    4: document.querySelector('#keybeam-4'),
    5: document.querySelector('#keybeam-5'),
    otofuda: document.querySelector('#keybeam-otofuda')
  }

  const isTapsound = document.querySelector("#preview-play-tap").checked;
  const isKeybeam = document.querySelector("#preview-show-keybeam").checked;

  // タップ音とキービーム
  setTimeout(() => {
    if(isTapsound || isKeybeam) {
      for(const note of fumenObject[currentLevel]) {
        const _measure = note.measure + 1 - _start;
        const _timing = one_measure * _measure + one_measure * (note.position / note.split);
        if([1, 2, 3, 4, 5].includes(note.type)) {
          if(_timing > _offset / 1000) tap_sounds.push(setTimeout(() => {
            if(isKeybeam) {
              let targetElem = keybeamsElems[note.lane];
              if(note.type == 5) targetElem = keybeamsElems.otofuda; // 音札ノーツ用キービーム
              targetElem.classList.remove('-on', '-left', '-right');
              targetElem.classList.add('-on');
              if(note.type == 3) setTimeout(() => targetElem.classList.add('-left'), 50);
              if(note.type == 4) setTimeout(() => targetElem.classList.add('-right'), 50);
              if(note.type == 2) {
                const end = note.end[0];
                const end_timing = one_measure * (end.measure + 1 - _start) + one_measure * (end.position / end.split);
                const end_delay = (end_timing - _timing) * 1000 + 50;
                if(isTapsound && !tap_timings.includes(end_timing)) {
                  tap_timings.push(end_timing);
                  setTimeout(() => {
                    const _tap_audio = new Audio('./guide.mp3');
                    _tap_audio.volume = Number(kaf.preview_volume_tap);
                    _tap_audio.play().catch(err => console.warn(err));
                  }, end_delay - 50);
                }
                setTimeout(() => {
                  targetElem.classList.remove('-on');
                  comboNum++;
                  comboText.textContent = comboNum;
                }, end_delay);
              }
              else {
                setTimeout(() => {
                  targetElem.classList.remove('-on');
                  comboNum++;
                  comboText.textContent = comboNum;
                }, 30);
              }
            }
            if(isTapsound && !tap_timings.includes(_timing)) {
              const _tap_audio = new Audio('./guide.mp3');
              _tap_audio.volume = Number(kaf.preview_volume_tap);
              _tap_audio.play().catch((err) => console.warn(err));
              tap_timings.push(_timing);
            }
          }, _timing * 1000));
          else {
            comboNum++;
          }
        }
      }
    }
  }, playDelay);

  // 最終小節で停止
  // setTimeout(previewStop, one_measure * (kaf.maxMeasure - _start + 1) * 1000 + _offset);
}

function previewStop() {
  // タップ音の再生予約解除
  for(const t of tap_sounds) clearInterval(t);
  for(const t of preview_timings) clearInterval(t);
  preview_timings = [];
  tap_sounds = [];
  if(document.querySelector('#moveline')) {
    document.querySelector('#preview').removeChild(document.querySelector('#moveline'));
  }
  clearInterval(INTERVAL);
  $("#preline").hide();
  preAudio.pause();
  message("譜面プレビューを停止しました");

  $("#preview").removeClass("playing").css("margin-top", "0");
  $("#preview").css("transition", "none").css("top", "0");
}

function selectPreaudio(files) {
  preAudio = new Audio();
  preAudio.src = window.URL.createObjectURL(files[0]);
}
