// ==UserScript==
// @name        Etsy Sales Autocomplete
// @namespace   Violentmonkey Scripts
// @match       https://www.etsy.com/your/shops/me/sales-discounts*
// @grant       none
// @version     2024.9.25
// @author      Chi-Feng Hsu
// @description 9/24/2024, 2:45:25 PM
// @downloadURL https://raw.githubusercontent.com/mr-cfh/Home-Projects/refs/heads/main/Userscripts/Etsy/EtsySalesAutocomplete.js
// @updateURL   https://raw.githubusercontent.com/mr-cfh/Home-Projects/refs/heads/main/Userscripts/Etsy/EtsySalesAutocomplete.js

// ==/UserScript==

const STEP_CONTINUE = 1;
const STEP_REVIEW = 2;
const STEP_CONFIRM = 3;

var currentStep = 0;

function checkButton(buttonName) {
  const EXACT_MATCH = 0;
  var targetButton;
  var buttonList = document.getElementsByTagName("button");

  for (let i=0;i<buttonList.length;i++) {
    if (buttonList[i].innerText != undefined) {
      if (buttonList[i].textContent.localeCompare(buttonName) == EXACT_MATCH) {
        targetButton = buttonList[i];
        break;
      }
    }
  }
  return targetButton;
}

function confirmationClicks() {

  if (currentStep == STEP_CONTINUE) {
    var buttonContinue = checkButton("Continue");
      if (currentStep == STEP_CONTINUE && buttonContinue != undefined) {
      buttonContinue.dispatchEvent( new Event('click'));
      currentStep = STEP_REVIEW;
      console.log("Continue");
    }
  } else if (currentStep == STEP_REVIEW) {
    var buttonReview = checkButton("Review and confirm");
    if (buttonReview != undefined) {
      buttonReview.dispatchEvent( new Event('click'));
      currentStep = STEP_CONFIRM;
      console.log("Review");
    }
  } else if (currentStep == STEP_CONFIRM) {
    var buttonConfirm = checkButton("Confirm and create sale");
    if (buttonConfirm != undefined) {
      buttonConfirm.dispatchEvent( new Event('click'));
      currentStep = STEP_CONTINUE;
      console.log("Confirm");
    }
  }
}

function getSalesDate() {
  var latestDateString = document.querySelectorAll('[role="rowheader"]')[2].children[1].innerText;

  // Get Last Sales Date
  var year = parseInt(latestDateString.substring(0,4));
  var month = parseInt(latestDateString.substring(4,6)) - 1;
  var day = parseInt(latestDateString.substring(6,8));

  // Get New Sales Date
  var latestDate = new Date(year, month, day);
  var newDate = latestDate.addDays(1);

  let newYear = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(newDate);
  let newMonth = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(newDate);
  let newDay = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(newDate);

  let salesDate = {
    durationDate: Array(newMonth, newDay, newYear).join("/"),
    name:  Array(newYear, newMonth, newDay).join("")
  };

  return salesDate;
}

function fillSalesForm() {
  let salesDate = getSalesDate();
  isSettingUpSale = true;

  var fieldDiscount = document.getElementById("reward-percentage");
  fieldDiscount.value = "50";
  // Trigger the onchange event
  fieldDiscount.dispatchEvent( new Event('change'));

  var fieldSaleStartDate = document.getElementsByClassName("input")[0];
  fieldSaleStartDate.dispatchEvent( new Event('focusin'))
  fieldSaleStartDate.value = salesDate.durationDate;
  fieldSaleStartDate.dispatchEvent( new Event('input'));
  fieldSaleStartDate.dispatchEvent( new Event('focusout'))

  var fieldSaleEndDate = document.getElementsByClassName("input")[1];
  fieldSaleEndDate.dispatchEvent( new Event('focusin'))
  fieldSaleEndDate.value = salesDate.durationDate;
  fieldSaleEndDate.dispatchEvent( new Event('input'));
  fieldSaleEndDate.dispatchEvent( new Event('focusout'))

  var fieldSaleName = document.getElementsByClassName("input")[2];
  fieldSaleName.value = salesDate.name;
  fieldSaleName.dispatchEvent( new Event('input'));

  // Action to release Date Picker from displaying
  document.getElementById("additional-details").focus();

  currentStep = STEP_CONTINUE;
  confirmationClicks();
}

function createADaysFunction() {
  Date.prototype.addDays = function(days) {
      var date = new Date(this.valueOf());
      date.setDate(date.getDate() + days);
      return date;
  }
}

function initialSetup() {

  var floatButtonA = document.createElement("a");
  floatButtonA.style.position = "fixed";
  floatButtonA.style.width = "20px";
  floatButtonA.style.height = "20px";
  floatButtonA.style.bottom = "500px";
  floatButtonA.style.right = "600px";
  floatButtonA.style.backgroundColor = "#0C9";
  floatButtonA.style.color = "#FFF";
  floatButtonA.style.borderRadius = "50px";
  floatButtonA.style.textAlign = "center";
  floatButtonA.style.boxShadow = "2px 2px 3px #999";
  floatButtonA.style.zIndex = "999"
  floatButtonA.style.display = "none";

  var floatButtonI = document.createElement("i");
  floatButtonI.style.marginTop = "22px";

  floatButtonA.appendChild(floatButtonI);
  document.body.appendChild(floatButtonA);

  floatButtonA.addEventListener("click", fillSalesForm, false);

  // configuration of the observer and target
  var config = { attributes: true, childList: true, characterData: true, subtree: true };
  var mTarget = document.getElementById("wt-modal-container");

  // Implement the code that will run when triggered
  var mObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        // Check for Sale Popup Form
        if (document.getElementById("wt-modal-container").childElementCount == 4) {
          floatButtonA.style.display = "inline";
          confirmationClicks();
        } else {
          floatButtonA.style.display = "none";
          currentStep = 0;
        }
      });
  });

  // Observe the target
  mObserver.observe(mTarget, config);
}

// START

initialSetup();
createADaysFunction();