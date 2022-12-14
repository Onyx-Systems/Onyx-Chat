import { setAlert } from "./display.js";
import { getLevenshteinDistance, copyToClipboard } from "./helpers.js";

const TestingInput = document.getElementById("testing-input");
const TestingSubmit = document.getElementById("testing-submit");
const TestingOutput = document.getElementById("testing-output");
const TestingForm = document.getElementById("testing-form");
const TestingIntent = document.getElementById("intent-input");
const AddResponse = document.getElementById("add-response");
const StartEdit = document.getElementById("start-edit");
const ConfirmTest = document.getElementById("confirm-test");

// * edit modal stuff
const EditModal = document.getElementById("edit-modal");
const ExampleText = document.getElementById("edit-text");
const Intent = document.getElementById("edit-intent");
const CancelEdit = document.getElementById("cancel-edit");
const SubmitEdit = document.getElementById("submit-edit");

// * Responses Modal Stuff
const ResponsesModal = document.getElementById("responses-modal");
const CurrentResponses = document.getElementById("current-responses");
const CancelResponses = document.getElementById("cancel-responses");
const SubmitResponses = document.getElementById("submit-responses");
const ResponseInput = document.getElementById("response-input");

const displayOutput = (bool) => {
  if (bool) {
    TestingOutput.style.display = "initial";
  } else {
    TestingOutput.style.display = "none";
  }
};
displayOutput(false);

const displayInputs = (bool) => {
  if (!bool) {
    TestingForm.style.display = "none";
    StartEdit.style.display = "none";
    AddResponse.style.display = "none";
    ConfirmTest.style.display = "none";
  } else {
    TestingForm.style.display = "block";
    StartEdit.style.display = "block";
    AddResponse.style.display = "block";
    ConfirmTest.style.display = "block";
  }
};
displayInputs(false);

const updateModel = async () => {
  try {
    const { result, message } = await axios
      .post("/training/retrain")
      .then((res) => res.data)
      .catch((err) => {
        console.error(err);
        setAlert("There was an error training the model", "danger");
      });

    const trainedbool = !!Number(result);

    if (trainedbool) {
      setAlert(message, "success");
    }

    return trainedbool;
  } catch (err) {
    console.error(err);
    setAlert("Error updating model, check console for more info.", "danger");
    return false;
  }
};
updateModel();

const getIntents = async () => {
  try {
    const { intents } = await axios
      .get("/training/intents")
      .then((res) => res.data)
      .catch((err) => {
        console.error(err);
        setAlert("There was an error getting intents", "danger");
      });

    return intents;
  } catch (err) {
    console.error(err);
    setAlert("Error getting intents, check console for more info.", "danger");
    return [];
  }
};

let fetchedIntents = await getIntents();

const getNLUForInput = async () => {
  try {
    const nlu = await axios
      .post(
        "/chat",
        {
          message: TestingInput.value,
        },
        {
          headers: {
            "x-session_id": "training",
          },
        }
      )
      .then((res) => {
        if (res.data.error) {
          setAlert(res.data.error, "danger");
          return;
        }
        return res.data;
      })
      .catch((err) => {
        console.error("Error:", err);
        setAlert(
          "Error getting chat response, check console for more info.",
          "danger"
        );
      });

    console.info("NLU Response:", nlu);

    TestingOutput.innerHTML = nlu.answer;
    TestingIntent.value = nlu.intent;

    displayOutput(true);
    displayInputs(true);
    return nlu;
  } catch (err) {
    console.error("Error:", err);
    setAlert(
      "Error getting NLU response, check console for more info.",
      "danger"
    );
  }
};

TestingSubmit.addEventListener("click", getNLUForInput);
// Testing Input should also call getNLUForInput when enter is pressed.
TestingInput.addEventListener("keyup", (event) => {
  if (event.key === "Enter") {
    getNLUForInput();
  }
});

StartEdit.addEventListener("click", () => {
  EditModal.style.display = "flex";
  ExampleText.value = TestingInput.value;
  Intent.value = TestingIntent.value;
});

CancelEdit.addEventListener("click", () => {
  EditModal.style.display = "none";
});

SubmitEdit.addEventListener("click", async () => {
  try {
    const { data, message } = await axios
      .post("/training/datapoint", {
        intent: Intent.value,
        utterances: [ExampleText.value],
      })
      .then((res) => res.data)
      .catch((err) => {
        console.error(err);
        setAlert("There was an error editing the example", "danger");
      });

    if (data) {
      setAlert(message, "success");
      updateModel();
      TestingIntent.value = Intent.value;
      fetchedIntents = await getIntents();
    }

    return data;
  } catch (err) {
    console.error(err);
    setAlert("Error editing example, check console for more info.", "danger");
    return false;
  } finally {
    EditModal.style.display = "none";
  }
});

ConfirmTest.addEventListener("click", async () => {
  try {
    const { data, message } = await axios
      .post("/training/datapoint", {
        intent: TestingIntent.value,
        utterances: [TestingInput.value],
      })
      .then((res) => res.data)
      .catch((err) => {
        console.error(err);
        setAlert("There was an error editing the example", "danger");
      });

    if (data) {
      setAlert(message, "success");
      updateModel();
      TestingIntent.value = Intent.value;
      fetchedIntents = await getIntents();
    }

    return data;
  } catch (err) {
    console.error(err);
    setAlert("Error editing example, check console for more info.", "danger");
    return false;
  }
});

const getDataForIntent = async (intent) => {
  try {
    const { data } = await axios
      .get(`/training/intent/${intent}`)
      .then((res) => res.data)
      .catch((err) => {
        console.error(err);
        setAlert("There was an error getting responses", "danger");
      });

    return data;
  } catch (err) {
    console.error(err);
    setAlert("Error getting responses, check console for more info.", "danger");
    return [];
  }
};

AddResponse.addEventListener("click", async () => {
  ResponsesModal.style.display = "flex";
  const { answers } = await getDataForIntent(TestingIntent.value);

  if (answers) {
    answers.forEach((res) => {
      const newEl = makeResponseElement(res);
      CurrentResponses.appendChild(newEl);
    });
  }
});

const makeResponseElement = (response) => {
  const li = document.createElement("li");
  li.classList.add("current-responses__item");

  const span = document.createElement("span");
  span.innerText = response;

  const i = document.createElement("i");
  i.classList.add("material-symbols-outlined", "delete", "remove-response");
  i.innerText = "delete";
  i.title = "Delete Response";

  const copy = document.createElement("i");
  copy.classList.add("material-symbols-outlined", "copy", "copy-response");
  copy.innerText = "content_copy";
  copy.title = "Copy to clipboard";

  li.appendChild(span);
  li.appendChild(i);
  i.addEventListener("click", async (e) => {
    const res = await removeResponse(response);
    if (res) {
      CurrentResponses.removeChild(li);
    }
  });

  li.appendChild(copy);
  copy.addEventListener("click", () => {
    copyToClipboard(response);
  });

  return li;
};

const removeResponse = async (response) => {
  const intent = TestingIntent.value;
  const { data, message, success } = await axios
    .delete(`/training/response`, {
      data: {
        intent,
        response,
      },
    })
    .then((res) => res.data)
    .catch((err) => {
      console.error(err);
      setAlert("There was an error removing the response", "danger");
    });

  if (success) {
    setAlert(message, "success");
    updateModel();
  }

  return success;
};

CancelResponses.addEventListener("click", () => {
  ResponsesModal.style.display = "none";
  CurrentResponses.innerHTML = "";
  ResponseInput.value = "";
});

SubmitResponses.addEventListener("click", async () => {
  const intent = TestingIntent.value;
  const { data, message, success } = await axios
    .put(`/training/response`, {
      intent,
      response: ResponseInput.value,
    })
    .then((res) => res.data)
    .catch((err) => {
      console.error(err);
      setAlert("There was an error adding the response", "danger");
    });

  if (success) {
    setAlert(message, "success");
    updateModel();
    const newEl = makeResponseElement(ResponseInput.value);
    CurrentResponses.appendChild(newEl);
    ResponseInput.value = "";
  }

  return success;
});

Intent.addEventListener("keyup", async (event) => {
  const intents = fetchedIntents || (await getIntents());
  // get first 3 intents sorted by levenstein distance compared to the input
  // use getLevenshteinDistance to compare
  const closeIntents = intents
    .map((intent) => ({
      intent,
      distance: getLevenshteinDistance(intent, Intent.value),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((intent) => intent.intent);

  document.querySelector(".intent-suggestions")?.remove();
  const el = document.createElement("div");
  el.classList.add("intent-suggestions");

  closeIntents.forEach((intent) => {
    const span = document.createElement("span");
    span.classList.add("intent-suggestions__item");
    span.innerText = intent;
    span.addEventListener("click", () => {
      Intent.value = intent;
      el.remove();
    });
    el.appendChild(span);
  });

  if (event.key === "Enter") {
    el.remove();
  }

  Intent.parentElement.appendChild(el);
});
