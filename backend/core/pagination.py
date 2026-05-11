from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """
    Default pagination used across all ViewSets.
    - Default page size: 20
    - Client may request up to 100 per page via ?page_size=
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 1000