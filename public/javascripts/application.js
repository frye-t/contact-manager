const emptyChar = '&nbsp;';

class Contact {
  static #currentId = 1;

  constructor({id, full_name, email, phone_number, tags})  {
    if (id) {
      this.id = id;
      Contact.#currentId++;
    } else {
      this.id = Contact.#currentId++;
    }
    this.full_name = full_name;
    this.email = email;
    this.phone_number = phone_number;
    this.tags = tags || emptyChar;
  }
}

class ContactModel {
  constructor() {
    this.contacts = [];
    this.handleContactAdded = this.handleContactAdded.bind(this);
    this.handleBadRequest = this.handleBadRequest.bind(this);
    this.onBadRequest = null;
  }

  getContacts() {
    return $.ajax({
      url: '/api/contacts',
      method: 'GET',
      dataType: 'json',
    });
  }

  getContact(contactId) {
    return $.ajax({
      url: `/api/contacts/${contactId}`,
      method: 'GET',
      dataType: 'json',
    });
  }

  setContacts(contacts) {
    this.contacts = contacts;
  }

  addContact(contact) {
    $.ajax({
      url: '/api/contacts',
      method: 'POST',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify(contact),
      statusCode: {
        201: this.handleContactAdded,
        400: this.handleBadRequest,
      },
    });
  }

  editContact(contact) {
    $.ajax({
      url: `/api/contacts/${contact.id}`,
      method: 'PUT',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify(contact),
      statusCode: {
        201: this.handleContactEdited,
        400: this.handleBadRequest,
      }
    });
  }

  deleteContact(contactId) {
    $.ajax({
      url: `/api/contacts/${contactId}`,
      method: 'DELETE',
      statusCode: {
        204: this.handleContactDeleted,
        400: this.handleBadRequest,
      },
    });
  }

  handleContactAdded() {
    console.log("Contact successfully added");
  }

  handleContactEdited() {
    console.log("Contact succesfully edited");
  }

  handleContactDeleted() {
    console.log("Contact successfully deleted");
  }

  handleBadRequest(response) {
    if (typeof this.onBadRequest === 'function') {
      this.onBadRequest(response);
    }
  }
}

class ContactView {
  constructor() {
    this.controller;

    this.$contactsContainer = $('.contacts-container');
    this.$emptyContactList = $('.empty-contact-list');
    this.$contactFormContainer = $('.contact-form-container');
    this.$contactList = $('.contact-list');
    this.$searchInput = $('.search-input');

    this.contactTmpl = Handlebars.compile($('#contactTmpl').html());
    this.contactFormTmpl = Handlebars.compile($('#contactFormTmpl').html());

    this.bindEvents();
  }

  // Setup methods
  setController(controller) {
    this.controller = controller;
  }

  bindEvents() {
    this.$contactList.click(this.handleContactButtonsClick.bind(this));
    this.$contactFormContainer.click('button', this.handleFormButtonsClick.bind(this));
    this.$searchInput.on('input', this.handleSearchInput.bind(this));
    $('.add-contact').click(this.handleContactFormOperation.bind(this));
  }

  // Event Handlers
  handleContactButtonsClick(e) {
    const $button = $(e.target).closest('button');

    if ($button.prop("tagName") !== "BUTTON") return;

    const contactId = $button.closest('.contact').data('id');

    if ($button.hasClass('edit-btn')) {
      this.handleContactFormOperation(e, contactId);
    } else {
      if (confirm('Are you sure you want to delete this contact?')) {
        this.handleDeleteContact(contactId);
      } 
    }
  }

  handleFormButtonsClick(e) {
    const $target = $(e.target);
    if ($target.hasClass('cancel-btn')) this.handleFormCancelClick(e);
    if ($target.hasClass('submit-contact-btn')) this.handleFormSubmitClick(e);
  }

  handleFormCancelClick(e) {
    e.preventDefault();
    this.showHideContactForm('hide', e);
  }

  handleFormSubmitClick(e) {
    e.preventDefault();
    let $form = $('.contact-form');

    const $inputs = $form.find('input:visible');
    if (this.validateControls($inputs)) {
      const formData = new FormData($form[0]);
      if ($form.data('operation') === 'create') {
        this.controller.handleContactFormCreate(formData);
      } else {
        this.controller.handleContactFormEdit(formData);
      }
    }
  }

  handleContactFormOperation(e, contactId) {
    const operation = contactId ? 'edit' : 'create';
    this.showHideContactForm(operation, e, contactId);
  }

  handleDeleteContact(contactId) {
    this.controller.handleDeleteContact(contactId);
  }

  handleSearchInput() {
    const searchTerm = this.$searchInput.val().trim().toLowerCase();
    const filteredContacts = this.controller.filterContacts(searchTerm);
    this.displayContacts(filteredContacts);
  }

  validateControls($controls) {
    let allValid = true;
    $controls.each((_, control) => {
      const $formGroup = $(control.closest('.form-group'));
      const $label = $formGroup.find('label');
      const $errorMessage = $formGroup.find('p');

      if (!control.validity.valid) {
        $(control).addClass('invalid');
        $label.addClass('invalid');
        $errorMessage.css('display', 'block');

        allValid = false;
      } 
      else {
        $(control).removeClass('invalid');
        $label.removeClass('invalid');
        $errorMessage.css('display', 'none');
      }
    });

    return allValid;
  }

  // UI Manipulation
  showHideContactForm(operation, e, contactId = undefined) {
    if (e) e.preventDefault();

    if (operation !== 'hide') {
      const title = operation === 'edit' ? 'Edit Contact' : 'Create Contact';
      this.updateContactFormContainer(title, contactId, operation);
    }

    this.toggleContactFormContainer();
  }

  updateContactFormContainer(title, contactId, operation) {
    this.$contactFormContainer.html(this.contactFormTmpl({ title, operation }));
    if (operation === 'edit') {
      this.updateContactFormFields(contactId);
    }
  }

  async updateContactFormFields(contactId) {
    const contact = await this.controller.getContact(contactId);
    this.setFormInputValue('id', contact.id);
    this.setFormInputValue('full_name', contact.full_name);
    this.setFormInputValue('phone_number', contact.phone_number);
    this.setFormInputValue('email', contact.email);
    if (contact.tags !== emptyChar) {
      this.setFormInputValue('tags', contact.tags)
    }
  }

  setFormInputValue(inputName, value) {
    this.$contactFormContainer.find(`input[name="${inputName}"]`).val(value);
  }

  toggleContactFormContainer() {
    this.$contactFormContainer.toggle('slide', { direction: 'down' });
    this.$contactsContainer.toggle('slide', {direction: 'up'});
  }

  displayContacts(contacts) {
    if (contacts.length === 0) {
      this.$emptyContactList.show();
    } else {
      this.$emptyContactList.hide();
    }
    $('.contact-list').html(this.contactTmpl({contacts}));
  }

  displayError(errorMessage) {
    alert(errorMessage);
  }
}

class ContactController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  init() {
    this.model.onBadRequest = this.handleBadRequest.bind(this);
    this.getContacts();
  }

  handleContactFormCreate(formData) {
    const contactData = this.parseFormData(formData);
    const contact = new Contact(contactData);
    let response = this.model.addContact(contact);
    this.finishFormOperation();
  }

  handleContactFormEdit(formData) {
    const contactData = this.parseFormData(formData);
    const contact = new Contact(contactData);
    this.model.editContact(contact);
    this.finishFormOperation();
  }

  handleDeleteContact(contactId) {
    this.model.deleteContact(contactId);
    this.getContacts();
  }

  handleBadRequest(response) {
    const errorMessage = `${response.status}: ${response.statusText}`;
    this.view.displayError(errorMessage)
  }

  parseFormData(formData) {
    const contactData = {
      id: +formData.get('id'),
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      phone_number: formData.get('phone_number'),
      tags: formData.get('tags')
    };
    
    // Remove id if adding a new contact
    if (contactData.id === 0) delete contactData.id;

    return contactData;
  }

  async getContacts() {
    let contactsJson = await this.model.getContacts();
    let contacts = contactsJson.map(contactData => {
      return new Contact(contactData);
    });
    this.model.setContacts(contacts);
    this.view.displayContacts(contacts);
  }

  async getContact(contactId) {
    let contactJson = await this.model.getContact(contactId);
    return new Contact(contactJson);
  }

  finishFormOperation() {
    this.view.toggleContactFormContainer();
    this.getContacts();
  }

  filterContacts(searchTerm) {
    if (!searchTerm) {
      return this.model.contacts;
    } else {
      return this.model.contacts.filter(contact => {
        const fullName = contact.full_name.toLowerCase();
        const tags = contact.tags.toLowerCase();
        return (fullName.includes(searchTerm) || tags.includes(searchTerm));
      });
    }
  }
}

$(() => {
  const model = new ContactModel();
  const view = new ContactView();
  const controller = new ContactController(model, view);

  view.setController(controller);
  controller.init();
});
