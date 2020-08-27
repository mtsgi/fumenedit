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
      if (
        window.confirm(`${target_notes.length}ノーツを${this.copy_measure_level}の${this.copy_measure_to}小節にコピーします(ロングノーツはコピーしません)。よろしいですか？`)
      ) {
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
        if (note.measure == this.flip_measure) {
          const new_lane = 6 - note.lane;
          let new_obj = Object.assign(note, { lane: new_lane });
          if (note.type == 2) {
            new_obj.end = new_obj.end.map(end => Object.assign(end, { lane: 6 - end.lane }));
          }
          else if (note.type == 3) new_obj.type = 4;
          else if (note.type == 4) new_obj.type = 3;
          return new_obj;
        }
        else return note;
      });
      fumenObject[currentLevel] = flipped_notes;
      drawPreview(fumenObject[currentLevel]);
      message('左右反転しました。');
    },
    alldisp() {
      if (this.infoDisp) {
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
      for (const i in fumenObject[currentLevel]) {
        const self = fumenObject[currentLevel][i];
        const self_timing = self.measure + (self.position / self.split);
        for (const k in fumenObject[currentLevel]) {
          const note = fumenObject[currentLevel][k];
          const note_timing = note.measure + (note.position / note.split);
          if (i !== k && self_timing === note_timing && self.lane === note.lane && self.type === note.type) {
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
      if (result) {
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

$(document).ready(function () {
  window.addEventListener('beforeunload', function (e) {
    e.preventDefault();
    e.returnValue = '移動してもよろしいですか？';
  });

  // SUD+調整機能
  document.querySelector('#preview-sud').addEventListener('change', e => {
    document.querySelector('#sudden').style.height = `${e.target.value}px`;
  });

  // キービーム光らせる
  document.addEventListener('keydown', e => {
    switch (e.key) {
      case "z":
        document.querySelector('#keybeam-1').classList.add('-on');
        break;
      case "x":
        document.querySelector('#keybeam-2').classList.add('-on');
        break;
      case "c":
        document.querySelector('#keybeam-3').classList.add('-on');
        break;
      case "v":
        document.querySelector('#keybeam-4').classList.add('-on');
        break;
      case "b":
        document.querySelector('#keybeam-5').classList.add('-on');
        break;
      default:
        break;
    }
  });
  document.addEventListener('keyup', e => {
    switch (e.key) {
      case "z":
        document.querySelector('#keybeam-1').classList.remove('-on');
        break;
      case "x":
        document.querySelector('#keybeam-2').classList.remove('-on');
        break;
      case "c":
        document.querySelector('#keybeam-3').classList.remove('-on');
        break;
      case "v":
        document.querySelector('#keybeam-4').classList.remove('-on');
        break;
      case "b":
        document.querySelector('#keybeam-5').classList.remove('-on');
        break;
      default:
        break;
    }
  });

  //ノーツを追加
  $("#form-add").on("click", () => {
    prev[currentLevel] = fumenObject[currentLevel];
    let type = Number($("#form-type").val())
    let measure = Number($("#form-measure").val());
    const formValues = {
      opt0: Number(kaf.form_option_0),
      opt1: Number(kaf.form_option_1),
      opt2: Number(kaf.form_option_2),
      lane: Number($("#form")[0].lane.value),
      position: Number($("#form-position").val()),
      split: Number($("#form-split").val())
    }

    let lane = -1;
    if (type == 1 || type == 2 || type == 3 || type == 4) {
      lane = formValues.lane;
    }
    else if (type == 95) {
      lane = formValues.lane;
      if (formValues.opt0 + lane > 6) {
        message("そのレーン位置に配置することはできません。");
        return;
      }
    }
    else if (type == 5) lane = 3;

    let position = formValues.position;
    let split = formValues.split;
    let option = [];
    if (type == 3 || type == 4) {
      if (formValues.opt0 > 0) option[0] = formValues.opt0;
      else option[0] = -1;
      if (formValues.opt1 != 0 && formValues.opt2 > 0) {
        option[1] = formValues.opt1;
        option[2] = formValues.opt2;
      }
    }
    if (type == 95) {
      if (position == 0) option[0] = -1; // 小節線非表示制御
      else if (formValues.opt0 > 0) option[0] = formValues.opt0;
      else option[0] = 5;
    }
    if (type == 97 || type == 98) {
      option[0] = formValues.opt0;
    }
    let end = [];
    one_measure = 60 / Number(kaf.info_bpm) * Number(kaf.info_beat);
    const self_timing = one_measure * measure + one_measure * (position / split);
    if (type == 2) {
      const end_measure = Number($("#endform-measure").val());
      const end_lane = Number($("#endform-lane").val());
      const end_position = Number($("#endform-position").val());
      const end_split = Number($("#endform-split").val());
      const end_timing = one_measure * end_measure + one_measure * (end_position / end_split);
      if (end_position < 0 || end_position >= end_split || self_timing >= end_timing) {
        message("不正LNエラー（ロングノーツは始点が手前に存在する必要があります）");
        return;
      }
      end = [
        {
          "type": 1,
          "measure": end_measure,
          "lane": end_lane,
          "position": end_position,
          "split": end_split,
          "option": [],
          "end": []
        }
      ]
    }
    // 重複チェック
    for (const note of fumenObject[currentLevel]) {
      const note_timing = one_measure * note.measure + one_measure * (note.position / note.split);
      if (self_timing === note_timing && lane === note.lane && type === note.type) {
        message("その場所にはすでにノートが配置されています。", JSON.stringify(note));
        return;
      }
    }
    // 音札ノーツは全難易度に挿入
    if (type == 5) {
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
      } catch (error) {
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
    if (type != 5) message(`${measure}小節にノートを配置しました。`);

    drawPreview(fumenObject[currentLevel]);
  });

  //小節の高さ
  if (localStorage.getItem("fumenedit-measure-height")) measureHeight = Number(localStorage.getItem("fumenedit-measure-height"));
  $("#measure-height-num").text(measureHeight);
  $("#measure-height").val(measureHeight).on("change", function () {
    measureHeight = this.value;
    $("#measure-height-num").text(measureHeight);
    localStorage.setItem("fumenedit-measure-height", this.value);
    selectLevel(currentLevel);
  });

  //キーボード操作
  $(document).on("keyup", (e) => {
    //Enterキーでノート追加
    if (e.which == 13) $("#form-add").click();
    //左右キーでlane移動
    else if (e.which == 37) {
      $("#form")[0].lane.value = Number($("#form")[0].lane.value) - 1;
      $("#endform-lane").val($("#form")[0].lane.value);
    }
    else if (e.which == 39) {
      $("#form")[0].lane.value = Number($("#form")[0].lane.value) + 1;
      $("#endform-lane").val($("#form")[0].lane.value);
    }
    //Shift押しながら上下でLN終点も移動
    else if (e.shiftKey) {
      if (e.which == 38) $("#endform-position").val(Number($("#endform-position").val()) + 1);
      else if (e.which == 40) $("#endform-position").val(Number($("#endform-position").val()) - 1);
      let pos = Number($("#endform-position").val());
      let spl = Number($("#endform-split").val());
      if (pos < 0) {
        $("#endform-position").val(0);
      };
      if (pos == spl) {
        $("#endform-position").val(0);
        $("#endform-measure").val(Number($("#endform-measure").val()) + 1);
      };
      if (pos == -1) {
        $("#endform-position").val(spl - 1);
        $("#endform-measure").val(Number($("#endform-measure").val()) - 1);
      };
      if (spl < 1) {
        $("#endform-split").val(1);
      };
    }
    // Commandキーでノーツタイプ変更
    else if (e.which == 224) {
      if ($("#form-type").val() == 99) $("#form-type").val(1);
      else if ($("#form-type").val() == 5) $("#form-type").val(97);
      else $("#form-type").val(Number($("#form-type").val()) + 1);

      if ($("#form-type").val() == 2) $("#endform").show();
      else $("#endform").hide();
    }
  }).on("keyup keydown keypress", () => drawShadow());

  //小節前後移動
  $("#form-prev").on("click", () => $("#form-measure").val(Number($("#form-measure").val()) - 1));
  $("#form-next").on("click", () => $("#form-measure").val(Number($("#form-measure").val()) + 1));

  //UndoとRedo
  $("#form-undo").on("click", () => {
    if (prev[currentLevel]) {
      fumenObject[currentLevel] = prev[currentLevel];
      prev[currentLevel] = null;
    }
    else message("Undoできません");
    drawPreview(fumenObject[currentLevel]);
  });

  $("#form-redo").on("click", () => {
    if (!prev[currentLevel]) {
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
    if (pos < 0) {
      $("#form-position").val(0);
    };
    if (pos == spl) {
      $("#form-position").val(0);
      $("#form-next").click();
    };
    if (pos == -1) {
      $("#form-position").val(spl - 1);
      $("#form-prev").click();
    };
    if (spl < 1) {
      $("#form-split").val(1);
    };
  });
  $("#endform-position").on("change", () => {
    let pos = Number($("#endform-position").val());
    let spl = Number($("#endform-split").val());
    if (pos < 0) {
      $("#endform-position").val(0);
    };
    if (pos == spl) {
      $("#endform-position").val(0);
      $("#endform-measure").val(Number($("#endform-measure").val()) + 1);
    };
    if (pos == -1) {
      $("#endform-position").val(spl - 1);
      $("#endform-measure").val(Number($("#endform-measure").val()) - 1);
    };
    if (spl < 1) {
      $("#endform-split").val(1);
    };
  });

  // シャドーノートを表示
  $("input, select").on("change", () => drawShadow());

  // 非表示フォーム
  const formOptionElements = [
    document.querySelector('#form-option-0'),
    document.querySelector('#form-option-1'),
    document.querySelector('#form-option-2'),
  ];
  formOptionElements.forEach(foe => foe.style.display = 'none');
  const formGroupEnd = document.querySelector('#endform');
  formGroupEnd.style.display = 'none';

  // フォームのタイプ変更時
  document.querySelector('#form-type').addEventListener('change', e => {
    formOptionElements.forEach(foe => foe.style.display = 'none');
    formGroupEnd.style.display = 'none';
    const _type = Number(event.target.value);
    switch (_type) {
      case 2:
        formGroupEnd.style.display = 'block';
        break;
      case 3:
      case 4:
        formOptionElements[0].style.display = 'block';
        formOptionElements[0].querySelector('.form-option-label').textContent = 'width(幅)';
        kaf.form_option_0 = '-1';
        formOptionElements[0].querySelector('.kit-textbox').value = '-1';
        formOptionElements[1].style.display = 'block';
        formOptionElements[1].querySelector('.form-option-label').textContent = 'offsetNumer(OFFSET分子)';
        formOptionElements[2].style.display = 'block';
        formOptionElements[2].querySelector('.form-option-label').textContent = 'offsetDenom(OFFSET分母)';
        break;
      case 95:
        formOptionElements[0].style.display = 'block';
        formOptionElements[0].querySelector('.form-option-label').textContent = 'length(横の長さ)';
        kaf.form_option_0 = '5';
        formOptionElements[0].querySelector('.kit-textbox').value = '5';
        break;
      case 97:
        formOptionElements[0].style.display = 'block';
        formOptionElements[0].querySelector('.form-option-label').textContent = 'beatChange(拍)';
        break;
      case 98:
        formOptionElements[0].style.display = 'block';
        formOptionElements[0].querySelector('.form-option-label').textContent = 'bpmChange(BPM)';
        break;
      default:
        break;
    }
  });

  message(currentLevel + "をロードしました");
});

function drawPreview(obj) {
  const previewElement = document.querySelector('#preview');
  previewElement.textContent = '';
  let notesnum = 0, notesid = 0, maxMeasure = 0;
  let notes_tap = 0, notes_long = 0, notes_flick = 0, notes_otofuda = 0;
  let notes_1 = 0, notes_2 = 0, notes_3 = 0, notes_4 = 0, notes_5 = 0;
  let hiddenMeasureLine = []; // 小節線非表示小節
  //1ノートずつ処理
  for (let i of obj) {
    notesid++;
    switch (i.type) {
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
    switch (i.lane) {
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
    if (i.measure > maxMeasure) maxMeasure = i.measure;
    // ノートを描画
    const noteElement = document.createElement('span');
    noteElement.id = `note${notesid}`;
    noteElement.setAttribute('data-n', String((notesid - 1)));
    previewElement.appendChild(noteElement);
    noteElement.insertAdjacentHTML('beforeend', `<i class="noteinfo">${i.position}/${i.split}</i>`);

    // ノートを配置
    const positionTop = (i.measure * measureHeight) + measureHeight * (i.position / i.split);
    let positionRight = (i.lane - 1) * 60 + 40;
    noteElement.classList.add(`type${i.type}`, `option${i.option}`);
    noteElement.style.right = `${positionRight}px`;
    noteElement.style.top = `${positionTop}px`;

    if (i.position < 0 || i.position >= i.split) {
      noteElement.classList.add('-error');
    }
    if (i.type == 98) {
      noteElement.textContent = i.option;
    }
    else if (i.type == 97) {
      noteElement.textContent = `${i.option}/4`;
    }
    else if (i.type == 95) {
      if (i.option[0]) {
        noteElement.style.width = `${60 * i.option[0]}px`;
      }
      if (i.position == 0) {
        noteElement.classList.add('-hidden');
        noteElement.textContent = '非表示制御';
        hiddenMeasureLine.push(i.measure);
      }
    }
    else if (i.type == 99) {
      noteElement.textContent = 'EOF';
    }
    // フリックノーツ処理
    else if (i.type == 3 || i.type == 4) {
      if (i.option[0] > 0) {
        noteElement.style.transform = `scaleX(${i.option[0]})`;
        noteElement.querySelector('.noteinfo').textContent += `(${i.option[0]}x)`;
      }
      if (i.option[1] != 0 && i.option[2] > 0) {
        positionRight += 60 * (i.option[1] / i.option[2]);
        noteElement.style.right = `${positionRight}px`;
      }
    }
    // ロングノーツ処理
    else if (i.type == 2) {
      for (let j in i.end) {
        const _end = i.end[j];
        if (Number(_end.measure) > maxMeasure) maxMeasure = Number(_end.measure);
        // 終端ノートを描画
        const endNoteElement = document.createElement('span');
        endNoteElement.id = `end${notesid}-${j}`;
        endNoteElement.setAttribute('data-n', String((notesid - 1)));
        previewElement.appendChild(endNoteElement);
        endNoteElement.insertAdjacentHTML('beforeend', `<i class="noteinfo">${_end.position}/${_end.split}</i>`);

        // 終端ノートを配置
        const endPositionRight = (_end.lane - 1) * 60 + 40;
        const endPositionTop = (_end.measure * measureHeight) + measureHeight * (_end.position / _end.split);
        endNoteElement.classList.add(`type${_end.type}`);
        endNoteElement.style.right = `${endPositionRight}px`;
        endNoteElement.style.top = `${endPositionTop}px`;
        if (_end.position < 0 || _end.position >= _end.split || positionTop >= endPositionTop) {
          endNoteElement.classList.add('-error');
        }

        // LN帯を描画
        if (i.lane == _end.lane) {
          previewElement.insertAdjacentHTML('beforeend', `<i id="long${notesid}-${j}" data-n="${(notesid - 1)}"></i>`);
          const longNoteElement = document.querySelector(`#long${notesid}-${j}`);
          longNoteElement.classList.add('long');
          longNoteElement.style.right = `${endPositionRight}px`;
          longNoteElement.style.top = `${positionTop}px`;
          longNoteElement.style.height = `${(endPositionTop - positionTop)}px`;
        }
      }
    }

    // ノートをクリックしたら消去
    noteElement.addEventListener('click', e => {
      const targetElement = e.target.closest('#preview span');
      prev[currentLevel] = fumenObject[currentLevel];
      if (fumenObject[currentLevel][targetElement.getAttribute("data-n")].type == 5) {
        message('[注意]音札ノーツを削除する場合は、全ての難易度で削除されているか確認してください');
      }
      fumenObject[currentLevel].splice(targetElement.getAttribute("data-n"), 1);
      message('ノートを消去しました');
      drawPreview(fumenObject[currentLevel]);
    });
  }

  //小節線の描画
  for (let i = 0; i <= maxMeasure; i++) {
    const measureElement = document.createElement('span');
    measureElement.textContent = i;
    measureElement.id = `measure${i}`;
    measureElement.classList.add('measure');
    if (hiddenMeasureLine.includes(i)) measureElement.classList.add('-hml');
    if (i == maxMeasure) measureElement.classList.add('-last');
    previewElement.appendChild(measureElement);
    measureElement.style.top = `${i * measureHeight}px`;
    measureElement.style.height = `${measureHeight}px`;
    measureElement.style.lineHeight = `${2 * measureHeight - 32}px`;
  }
  kaf.maxMeasure = maxMeasure;
  clearInterval(INTERVAL);

  document.querySelector('#notesnum').textContent = `${notesnum} Notes`;
  document.querySelector('#notesinfo').innerHTML = `[内訳]<br>
                        TAP ${notes_tap} (${Math.round(notes_tap / notesnum * 1000) / 10}%)<br>
                        LONG ${notes_long} (${Math.round(notes_long / notesnum * 1000) / 10}%)<br>
                        FLICK ${notes_flick} (${Math.round(notes_flick / notesnum * 1000) / 10}%)<br>
                        OTOFUDA ${notes_otofuda} (${Math.round(notes_otofuda / notesnum * 1000) / 10}%)<br>
                        [レーン別]<br>
                        壱: ${notes_1}　弐: ${notes_2}　参: ${notes_3}　肆: ${notes_4}　伍: ${notes_5}`;
  drawShadow();
}

function message(...text) {
  $("#debug").text('').show();
  for (const t of text) {
    $("#debug").append(`<div>${t}</div>`)
  }
  $("#debug").on("click", () => $("#debug").hide());
}

function drawShadow() {
  const _type = Number($("#form-type").val());
  const _lane = Number($("#form")[0].lane.value);
  const _measure = Number($("#form-measure").val());
  const _pos = Number($("#form-position").val());
  const _spl = Number($("#form-split").val());

  const _opt0 = Number(kaf.form_option_0);
  const _opt1 = Number(kaf.form_option_1);
  const _opt2 = Number(kaf.form_option_2);

  // シャドーを描画
  $("#noteShadow, #noteShadowEnd, #long-shadow").remove();
  const shadowElement = document.createElement('span');
  let shadowPositionRight = (_lane - 1) * 60 + 40;
  let shadowPositionTop = (_measure * measureHeight) + measureHeight * (_pos / _spl);
  shadowElement.id = 'noteShadow';
  shadowElement.classList.add(`type${_type}`);

  // シャドーを配置
  if (_type == 3 || _type == 4) {
    if (_opt0 > 0) {
      shadowElement.style.transform = `scaleX(${_opt0})`
    }
    if (_opt1 != 0 && _opt2 > 0) {
      shadowPositionRight += 60 * (_opt1 / _opt2);
    }
  }
  if (_type == 95 && _opt0) {
    shadowElement.style.width = `${60 * _opt0}px`;
  }
  if (_type == 95 && _pos == 0) {
    shadowElement.classList.add('-hidden');
  }
  shadowElement.style.right = `${shadowPositionRight}px`;
  shadowElement.style.top = `${shadowPositionTop}px`;
  document.querySelector('#preview').appendChild(shadowElement);

  // シャドー終点の描画
  if (_type == 2) {
    const previewElement = document.querySelector('#preview');
    const _end_type = Number($("#endform-type").val());
    const _end_lane = Number($("#endform-lane").val());
    const _end_measure = Number($("#endform-measure").val());
    const _end_pos = Number($("#endform-position").val());
    const _end_spl = Number($("#endform-split").val());

    // 終端ノートを描画
    const shadowEndElement = document.createElement('span');
    shadowEndElement.id = 'noteShadowEnd';
    shadowEndElement.classList.add(`type${_end_type}`);
    previewElement.appendChild(shadowEndElement);

    // 終端ノートを配置
    const endShadowPositionRight = (_end_lane - 1) * 60 + 40;
    const endShadowPositionTop = (_end_measure * measureHeight) + measureHeight * (_end_pos / _end_spl);
    shadowEndElement.classList.add(`type${_end_type}`);
    shadowEndElement.style.right = `${endShadowPositionRight}px`;
    shadowEndElement.style.top = `${endShadowPositionTop}px`;
    if (_end_pos < 0 || _end_pos >= _end_spl || shadowPositionTop >= endShadowPositionTop) {
      shadowEndElement.classList.add('-error');
    }

    // LN帯を描画
    if (_lane == _end_lane) {
      previewElement.insertAdjacentHTML('beforeend', '<i id="long-shadow"></i>');
      const shadowLongNoteElement = document.querySelector('#long-shadow');
      shadowLongNoteElement.classList.add('long');
      shadowLongNoteElement.style.right = `${endShadowPositionRight}px`;
      shadowLongNoteElement.style.top = `${shadowPositionTop}px`;
      shadowLongNoteElement.style.height = `${(endShadowPositionTop - shadowPositionTop)}px`;
    }
  }
}

function selectLevel(level) {
  if (!fumenObject[level]) {
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
  if (window.confirm("ファイルを開くと保存していない現在の内容は破棄されます。\n続行しますか？")) {
    let reader = new FileReader();
    reader.onload = function (event) {
      fumenObject = JSON.parse(event.target.result);
      prev = {
        "raku": null, "easy": null, "normal": null, "hard": null, "extra": null
      };
      console.log('譜面データをロード', fumenObject);
      if (fumenObject.info) {
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

    $('<input type="file" accept=".json, application/json">').on('change', function (event) {
      reader.readAsText(event.target.files[0]);
      document.title = `${event.target.files[0].name}｜譜面エディタ`;
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
  for (const t of tap_sounds) clearInterval(t);
  for (const t of preview_timings) clearInterval(t);
  tap_sounds = [];
  preview_timings = [];
  tap_timings = [];

  const playDelay = 100; // 処理待ち遅延(ms)
  let minusDelay = 0;

  if (_start > kaf.maxMeasure) {
    message(`${_start}小節がありません`);
    return false;
  }

  if (_movelineMode) {
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

      for (let i = _start; i <= kaf.maxMeasure; i++) {
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

  if (_start < 0) {
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
    if (isTapsound || isKeybeam) {
      for (const note of fumenObject[currentLevel]) {
        const _measure = note.measure + 1 - _start;
        const _timing = one_measure * _measure + one_measure * (note.position / note.split);
        if ([1, 2, 3, 4, 5].includes(note.type)) {
          if (_timing > _offset / 1000) tap_sounds.push(setTimeout(() => {
            if (isKeybeam) {
              let targetElem = keybeamsElems[note.lane];
              if (note.type == 5) targetElem = keybeamsElems.otofuda; // 音札ノーツ用キービーム
              targetElem.classList.remove('-on', '-left', '-right');
              targetElem.classList.add('-on');
              if (note.type == 3) setTimeout(() => targetElem.classList.add('-left'), 50);
              if (note.type == 4) setTimeout(() => targetElem.classList.add('-right'), 50);
              if (note.type == 2) {
                const end = note.end[0];
                const end_timing = one_measure * (end.measure + 1 - _start) + one_measure * (end.position / end.split);
                const end_delay = (end_timing - _timing) * 1000 + 50;
                if (isTapsound && !tap_timings.includes(end_timing)) {
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
            if (isTapsound && !tap_timings.includes(_timing)) {
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
  for (const t of tap_sounds) clearInterval(t);
  for (const t of preview_timings) clearInterval(t);
  preview_timings = [];
  tap_sounds = [];
  if (document.querySelector('#moveline')) {
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
