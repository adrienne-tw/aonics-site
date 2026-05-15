(function () {
  try {
    var form = document.getElementById("contact-form");
    var status = document.getElementById("contact-form-status");
    if (!form || !status) return;

    function showStatus(message, isError) {
      status.textContent = message;
      status.hidden = false;
      status.classList.toggle("contact-form-status--error", !!isError);
      status.classList.toggle("contact-form-status--success", !isError);
    }

    function clearFieldError(field) {
      field.removeAttribute("aria-invalid");
      field.classList.remove("contact-field--invalid");
    }

    function markFieldError(field) {
      field.setAttribute("aria-invalid", "true");
      field.classList.add("contact-field--invalid");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.hidden = true;
      status.classList.remove("contact-form-status--error", "contact-form-status--success");

      var fields = form.querySelectorAll("input, select, textarea");
      var firstInvalid = null;

      fields.forEach(function (field) {
        clearFieldError(field);
        if (!field.willValidate) return;
        if (field.checkValidity()) return;
        markFieldError(field);
        if (!firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        showStatus("Please complete the required fields highlighted below.", true);
        firstInvalid.focus();
        return;
      }

      var submitBtn = form.querySelector(".contact-form-submit");
      if (submitBtn) submitBtn.disabled = true;

      showStatus(
        "Thank you—your message has been received. Our team will follow up within two business days.",
        false
      );
      form.reset();
      if (submitBtn) submitBtn.disabled = false;
    });
  } catch (e) {}
})();
