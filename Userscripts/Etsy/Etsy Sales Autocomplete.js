// ==UserScript==
// @name        Etsy Sales Autocomplete
// @namespace   Violentmonkey Scripts
// @match       https://www.etsy.com/your/shops/me/sales-discounts*
// @grant       none
// @version     2024.9.25.1
// @author      -
// @description 9/24/2024, 2:45:25 PM
// @downloadURL https://raw.githubusercontent.com/mr-cfh/Home-Projects/refs/heads/main/Userscripts/Etsy/Etsy%20Sales%20Autocomplete.js
// @updateURL   https://raw.githubusercontent.com/mr-cfh/Home-Projects/refs/heads/main/Userscripts/Etsy/Etsy%20Sales%20Autocomplete.js

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

  // confirmationClicks();
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
  floatButtonA.style.bottom = "120px";
  floatButtonA.style.right = "270px";
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
  var config = { attributes: true, childList: true, characterData: true };
  var target = document.getElementById("wt-modal-container");

  // Implement the code that will run when triggered
  var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {

        // Check for Sale Popup Form
        if (document.getElementById("wt-modal-container").childElementCount == 4) {
          floatButtonA.style.display = "inline";
        } else {
          floatButtonA.style.display = "none";
        }
      });
  });

  // Observe the target
  observer.observe(target, config);
}

// START

initialSetup();
createADaysFunction();