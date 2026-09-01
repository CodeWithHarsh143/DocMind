class DocMindExceptions(Exception):
    """Base Exception for all custom Exceptions"""

    status_code = 500
    default_message = "Internal server error"

    def __init__(self, message: str | None = None):
        self.message = message or self.default_message
        super().__init__(self.message)


class NotAMemberException(DocMindExceptions):
    status_code = 403
    default_message = "You are not a member of this organization"


class NotAnAdminException(DocMindExceptions):
    status_code = 403
    default_message = "You are not an admin of this organization"


class AlreadyMemberException(DocMindExceptions):
    status_code = 409
    default_message = "That email is already a member of this organization."


class YourAreAlreadyAMemberException(DocMindExceptions):
    status_code = 400
    default_message = "You are already a member of this organization"


class MemberNotFoundException(DocMindExceptions):
    status_code = 404
    default_message = "Member not found."


class NonRemoveAbleException(DocMindExceptions):
    status_code = 400
    default_message = "You cannot remove the last admin of the organization."
