def datetime_adapter(obj, request):
    return obj.isoformat()


def decimal_adapter(obj, request):
    return float(obj)
